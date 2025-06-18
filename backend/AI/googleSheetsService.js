// backend/AI/googleSheetsService.js

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

const { google } = require('googleapis');
const path = require('path');

// 載入環境變數：確保 .env 檔案在 backend/ 目錄
// 因為此檔案在 backend/AI/，所以 .env 在上層目錄 ../
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (dotenvResult.error) {
    console.error("dotenv 載入 .env 檔案時發生錯誤 (googleSheetsService):", dotenvResult.error);
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEETS_KEY_FILE_PATH = process.env.GOOGLE_SHEETS_KEY_FILE;

if (!SPREADSHEET_ID) {
    console.error("錯誤：未找到 GOOGLE_SHEET_ID 環境變數。請檢查 .env 檔案的路徑與內容。");
    process.exit(1);
}
if (!GOOGLE_SHEETS_KEY_FILE_PATH) {
    console.error("錯誤：未找到 GOOGLE_SHEETS_KEY_FILE 環境變數。請檢查 .env 檔案的路徑與內容。");
    console.error("請在 .env 中設定 GOOGLE_SHEETS_KEY_FILE 為您的 JSON 金鑰檔案的絕對路徑。");
    process.exit(1);
}

const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_SHEETS_KEY_FILE_PATH, // 直接使用環境變數提供的絕對路徑
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const SHEET_NAME = '表單回應 1'; // 根據您的截圖，工作表名稱是 '表單回應 1'
const RANGE = `${SHEET_NAME}!A:Z`;

// 賓客數據的欄位映射 (將 Google Sheet 的中文表頭映射到程式碼中的英文 key)
// 這裡的值 (value) 應該是 Google Sheet 中「修剪過空格後」的精確表頭文字
const HEADER_MAPPING = {
    timestamp: '時間戳記',
    name: '姓名',
    relation: '與新人的關係', // 根據您的日誌，這是修剪空格後的正確名稱
    email: 'Email',
    blessing_style_selection: '祝福風格選擇', // 根據您的日誌，這是修剪空格後的正確名稱
    blessing_suggestion: '若想自己寫，請輸入祝福語', 
    photo_url: '清晰個人照片上傳', 
    audio_url: '上傳語音檔', 
    // 注意：`備註` 這個欄位在您的 Google Sheet 中存在，但它不會被程式碼處理或寫入
    // blessing 和 video_url 和 status 是我們程式碼會寫回 Google Sheet 的欄位
    blessing: 'blessing', 
    video_url: 'video_url', 
    status: 'status', 
    _rowIndex: '_rowIndex' // 內部使用，不對應 Google Sheet 實際欄位
};

/**
 * 從 Google Sheet 讀取所有賓客數據。
 * @returns {Array<Object>} 包含賓客數據的物件陣列，每個物件包含試算表中的所有相關欄位，並添加了內部索引 `_rowIndex`。
 */
async function readGuestsFromSheet() {
    try {
        console.log(`[DEBUG] 嘗試讀取 Google Sheet 中的工作表: '${SHEET_NAME}'`);
        console.log(`[DEBUG] 嘗試讀取 Google Sheet 的範圍: '${RANGE}'`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('Google Sheet 中沒有找到數據。');
            return [];
        }

        const headers = rows[0]; // 第一行是表頭
        console.log("[DEBUG] Google Sheet 實際讀取的表頭 (包含空格):", headers); // 顯示原始表頭
        const data = rows.slice(1).map((row, index) => {
            const rowObject = {};
            headers.forEach((header, colIndex) => {
                // ！！！關鍵修正：在比對前，修剪從 Google Sheet 讀取的表頭字符串！！！
                const trimmedHeader = header.trim(); 
                // 將 Google Sheet 的表頭（trimmedHeader）與 HEADER_MAPPING 中的值（中文表頭）進行匹配
                // 找到對應的英文 key，然後將 row[colIndex] 的值賦給該 key
                const mappedEntry = Object.entries(HEADER_MAPPING).find(([key, value]) => value.toLowerCase() === trimmedHeader.toLowerCase());
                
                if (mappedEntry) {
                    const englishKey = mappedEntry[0]; // 獲取英文 key (例如 'name', 'blessing_suggestion')
                    rowObject[englishKey] = row[colIndex] || ''; // 如果單元格為空則設定為空字串
                    // console.log(`[DEBUG] 映射成功: 表頭 '${trimmedHeader}' -> 內部鍵 '${englishKey}', 值: '${rowObject[englishKey]}'`); // 啟用此行可查看詳細映射過程
                } else {
                    // console.log(`[DEBUG] 映射失敗: 表頭 '${trimmedHeader}' (原始: '${header}') (未找到對應的內部鍵)。`); // 啟用此行可查看詳細映射失敗原因
                }
            });
            // 添加一個內部索引，用於後續更新試算表時定位行
            rowObject._rowIndex = index; 
            // console.log(`[DEBUG] 處理後行物件 (索引 ${index}):`, rowObject); // 啟用此行可查看詳細處理後的行物件
            return rowObject;
        });

        console.log("從 Google Sheet 讀取到的數據 (前2行):", data.slice(0, 2)); // 輸出前2行以供調試
        return data;
    } catch (error) {
        console.error('讀取 Google Sheet 失敗:', error.message);
        throw error;
    }
}

/**
 * 更新 Google Sheet 中的單元格。
 * @param {number} rowIndex 數據在陣列中的原始索引 (從 0 開始)。
 * @param {string} internalColumnName 程式碼中使用的欄位名稱（英文 key）。
 * @param {string} value 要寫入的值。
 */
async function updateSheetCell(rowIndex, internalColumnName, value) {
    try {
        let sheetColumnName = HEADER_MAPPING[internalColumnName] || internalColumnName;
        
        const headersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!1:1`, // 只讀取第一行以獲取表頭
        });
        const headers = headersResponse.data.values[0];

        // 查找實際的列索引，無論是根據 HEADER_MAPPING 中的值還是 internalColumnName
        // ！！！關鍵修正：在比對前，修剪從 Google Sheet 讀取的表頭字符串！！！
        const columnIndex = headers.findIndex(header => header.trim().toLowerCase() === sheetColumnName.toLowerCase()); // ADDED TRIM HERE

        if (columnIndex === -1) {
            console.error(`錯誤：未在 Google Sheet 中找到欄位名稱 '${sheetColumnName}' (內部名稱: ${internalColumnName})。請確認您的試算表表頭是否包含此欄位。`);
            return;
        }

        const columnLetter = String.fromCharCode(65 + columnIndex); // 將索引轉換為 Excel 的欄位字母
        const actualSheetRow = rowIndex + 2; // +2 是因為 Google Sheet 從 1 開始，且我們跳過了表頭行
        const updateRange = `${SHEET_NAME}!${columnLetter}${actualSheetRow}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updateRange,
            valueInputOption: 'RAW',
            resource: {
                values: [[value]],
            },
        });
        console.log(`成功更新 ${updateRange} 為 '${value}'。`);
    } catch (error) {
        console.error(`更新 Google Sheet 失敗 (${internalColumnName} ${rowIndex}):`, error.message);
        throw error;
    }
}

module.exports = {
    readGuestsFromSheet,
    updateSheetCell,
    HEADER_MAPPING // 也匯出映射，以供外部參考
};
