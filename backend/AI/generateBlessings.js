// backend/AI/generateBlessings.js

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

const path = require('path');
// 載入環境變數 (例如 OPENAI_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEETS_KEY_FILE)
// 使用 path.resolve 確保 dotenv.config 獲得絕對路徑
// 根據使用者說明，.env 檔案位於 backend 資料夾內，所以路徑是 ../.env
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 檢查 dotenv 是否成功解析了 .env 檔案
if (dotenvResult.error) {
    console.error("dotenv 載入 .env 檔案時發生錯誤:", dotenvResult.error);
} else if (dotenvResult.parsed) {
    console.log("dotenv 成功解析 .env 檔案。載入變數數量:", Object.keys(dotenvResult.parsed).length);
} else {
    console.log("dotenv 未解析任何變數，可能檔案為空或格式錯誤。");
}


const { google } = require('googleapis');
const OpenAI = require('openai'); // 確保已安裝 npm install openai

// 從環境變數獲取 API 金鑰
const OPENAI_KEY = process.env.OPENAI_KEY;
// 從環境變數獲取 Google Sheet ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
// 從環境變數獲取 Google Sheets 服務帳戶金鑰檔案路徑
const GOOGLE_SHEETS_KEY_FILE_PATH = process.env.GOOGLE_SHEETS_KEY_FILE;


// --- 新增日誌輸出，幫助你確認環境變數是否成功載入 ---
console.log('--- 環境變數檢查 ---');
console.log(`載入 .env 檔案路徑: ${path.resolve(__dirname, '../.env')}`); // 顯示解析後的 .env 檔案路徑

// 顯示已載入的環境變數 (遮蔽敏感資訊)
const envVars = {};
const relevantKeys = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'PORT', 'GOOGLE_SHEETS_KEY_FILE', 'GOOGLE_SHEET_ID', 'OPENAI_KEY', 'DID_API_KEY'];

for (const key of relevantKeys) {
    if (process.env[key]) {
        if (key.includes('KEY') || key.includes('PASSWORD') || key.includes('SECRET')) {
            envVars[key] = '已載入 (遮蔽)';
        } else {
            envVars[key] = process.env[key];
        }
    } else {
        envVars[key] = '未載入或為空';
    }
}
console.log('實際載入的環境變數 (與 .env 相關)：', envVars);
console.log('--------------------');
// --- 結束新增日誌輸出 ---


// 檢查 OpenAI 金鑰是否存在
if (!OPENAI_KEY) {
    console.error("錯誤：未找到 OPENAI_KEY 環境變數。請檢查 .env 檔案的路徑與內容。");
    process.exit(1); // 終止腳本執行
}

// 檢查 Google Sheet ID 是否存在
if (!SPREADSHEET_ID) {
    console.error("錯誤：未找到 GOOGLE_SHEET_ID 環境變數。請檢查 .env 檔案的路徑與內容。");
    process.exit(1); // 終止腳本執行
}

// 檢查 Google Sheets 服務帳戶金鑰檔案路徑是否存在
if (!GOOGLE_SHEETS_KEY_FILE_PATH) {
    console.error("錯誤：未找到 GOOGLE_SHEETS_KEY_FILE 環境變數。請檢查 .env 檔案的路徑與內容。");
    console.error("請在 .env 中設定 GOOGLE_SHEETS_KEY_FILE 為您的 JSON 金鑰檔案的絕對路徑。");
    process.exit(1); // 終止腳本執行
}


// 初始化 OpenAI 客戶端
const openai = new OpenAI({
    apiKey: OPENAI_KEY,
});

// Google Sheets 服務帳戶驗證
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_SHEETS_KEY_FILE_PATH, // 直接使用環境變數提供的絕對路徑
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // 讀寫 Google Sheet 的權限
});

const sheets = google.sheets({ version: 'v4', auth });

// --- 設定你的 Google Sheet 資訊 ---
// SPREADSHEET_ID 已從環境變數讀取
const SHEET_NAME = '表單回應 1'; // 根據您的截圖，工作表名稱是 '表單回應 1'
const RANGE = `${SHEET_NAME}!A:Z`; // 讀取整個工作表範圍，以獲取所有欄位

// 賓客數據的欄位映射 (將 Google Sheet 的中文表頭映射到程式碼中的英文 key)
// 這裡的值 (value) 應該是 Google Sheet 中「修剪過空格後」的精確表頭文字
const HEADER_MAPPING = {
    timestamp: '時間戳記',
    name: '姓名',
    relation: '與新人的關係', // 移除表頭中的多餘空格
    email: 'Email',
    blessing_style_selection: '祝福風格選擇', // 移除表頭中的多餘空格
    blessing_suggestion: '若想自己寫，請輸入祝福語', 
    photo_url: '清晰個人照片上傳', 
    audio_url: '上傳語音檔', 
    blessing: 'blessing', 
    video_url: 'video_url', 
    status: 'status', 
};

/**
 * 讀取 Google Sheet 中的數據
 * @returns {Array<Object>} 包含賓客數據的物件陣列
 */
async function readSheet() {
    try {
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
        const data = rows.slice(1).map(row => {
            const rowObject = {};
            headers.forEach((header, index) => {
                // ！！！關鍵修正：在比對前，修剪從 Google Sheet 讀取的表頭字符串！！！
                const trimmedHeader = header.trim(); 
                // 將 Google Sheet 的表頭（trimmedHeader）與 HEADER_MAPPING 中的值（中文表頭）進行匹配
                // 找到對應的英文 key，然後將 row[index] 的值賦給該 key
                const mappedEntry = Object.entries(HEADER_MAPPING).find(([key, value]) => value.toLowerCase() === trimmedHeader.toLowerCase());
                if (mappedEntry) {
                    const englishKey = mappedEntry[0]; // 獲取英文 key (例如 'name', 'blessing_suggestion')
                    rowObject[englishKey] = row[index] || ''; // 如果單元格為空則設定為空字串
                }
            });
            return rowObject;
        });

        console.log("從 Google Sheet 讀取到的原始數據 (前5行):", data.slice(0, 5)); // 輸出部分原始數據以供調試
        return data;
    } catch (error) {
        console.error('讀取 Google Sheet 失敗:', error.message);
        throw error;
    }
}

/**
 * 更新 Google Sheet 中的單元格
 * @param {number} rowIndex 數據在陣列中的索引 (從 0 開始)
 * @param {string} internalColumnName 程式碼中使用的欄位名稱（英文 key）
 * @param {string} value 要寫入的值
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
        const updateRange = `${SHEET_NAME}!${columnLetter}${rowIndex + 2}`; // +2 是因為 Google Sheet 從 1 開始，且我們跳過了表頭行

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

/**
 * 使用 OpenAI 生成祝福語
 * @param {string} name 賓客姓名
 * @param {string} relation 賓客關係
 * @param {string} blessingSuggestion 賓客提供的祝福語建議 (來自試算表)
 * @param {string} blessingStyleSelection 賓客選擇的祝福風格 (來自試算表)
 * @returns {string} 生成的祝福語
 */
async function generateBlessing(name, relation, blessingSuggestion, blessingStyleSelection) {
    try {
        // 構建給 OpenAI 的 Prompt
        let prompt = `請為以下這位賓客生成一段簡短、溫馨、適合在婚禮互動牆上播放的祝福語：\n\n`;
        prompt += `賓客姓名：${name}\n`;
        prompt += `與新人的關係：${relation}\n`;
        if (blessingSuggestion && blessingSuggestion.trim() !== '') {
            prompt += `賓客提供的祝福語建議：${blessingSuggestion}\n`;
        }
        if (blessingStyleSelection && blessingStyleSelection.trim() !== '') {
            prompt += `祝福語風格：${blessingStyleSelection}\n`; // <-- 將風格選擇加入 Prompt
        }
        prompt += `\n祝福語應自然流暢，並以第一人稱（AI 賓客分身）口吻表達。不需包含稱謂，直接開始祝福語內容。字數在 50-80 字之間。`;

        console.log(`為 ${name} 生成祝福語 (風格: ${blessingStyleSelection || '無'})`);

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [
                { role: "system", content: "你是一個專業且富有情感的婚禮祝福語生成助手。" },
                { role: "user", content: prompt },
            ],
            temperature: 0.7, 
            max_tokens: 150, 
        });

        const blessing = completion.choices[0].message.content.trim();
        console.log(`為 ${name} 生成的祝福語: "${blessing}"`);
        return blessing;
    } catch (error) {
        console.error(`調用 OpenAI 生成祝福語失敗 (${name}):`, error.message);
        return `很抱歉，無法為 ${name} 生成祝福語。`; 
    }
}

/**
 * 主函數：處理祝福語生成流程
 * @param {Array<number>} selectedGuestIndexes 選擇要處理的賓客在原始數據陣列中的索引。
 */
async function processBlessings(selectedGuestIndexes = []) {
    console.log("開始處理選定賓客的祝福語生成...");

    try {
        const guests = await readSheet(); 
        if (guests.length === 0) {
            console.log("沒有賓客數據可供處理。");
            return { success: true, message: "沒有賓客數據可供處理。" };
        }

        let processedCount = 0;
        const results = [];

        for (const originalIndex of selectedGuestIndexes) {
            const guest = guests[originalIndex]; 

            if (!guest) {
                console.warn(`跳過索引 ${originalIndex}: 找不到對應的賓客數據。`);
                results.push({ index: originalIndex, success: false, message: `找不到賓客數據。` });
                continue;
            }
            
            const requiresProcessing = 
                (!guest.blessing || guest.blessing.trim() === '') && 
                (guest.status === 'pending' || !guest.status || guest.status.trim() === '');


            if (requiresProcessing) {
                console.log(`處理賓客: ${guest.name} (原始索引: ${originalIndex}, 狀態: ${guest.status || '未定義'})`);
                
                // 傳遞 blessing_style_selection 給 generateBlessing
                const blessing = await generateBlessing(guest.name, guest.relation, guest.blessing_suggestion, guest.blessing_style_selection);

                await updateSheetCell(originalIndex, 'blessing', blessing); 
                await updateSheetCell(originalIndex, 'status', 'blessing_done');
                processedCount++;
                results.push({ index: originalIndex, success: true, blessing: blessing });
            } else {
                let skipReason = [];
                if (guest.blessing && guest.blessing.trim() !== '') skipReason.push('祝福語已存在');
                if (guest.status && guest.status !== 'pending' && guest.status.trim() !== '') skipReason.push(`狀態不符 (${guest.status})`);
                console.log(`跳過賓客: ${guest.name || '未定義'} (原始索引: ${originalIndex}) - ${skipReason.join('，')}。`);
                results.push({ index: originalIndex, success: false, message: `跳過處理: ${skipReason.join('，')}` });
            }
        }
        console.log(`祝福語生成流程完成。共處理了 ${processedCount} 位賓客。`);
        return { success: true, processedCount, results };
    } catch (error) {
        console.error('執行祝福語生成流程時發生錯誤:', error.message);
        return { success: false, message: `祝福語生成流程失敗: ${error.message}` };
    }
}

module.exports = {
    processBlessings
};

// 移除 main() 的自動呼叫
// main();
