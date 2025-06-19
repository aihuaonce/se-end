// backend/AI/googleSheetsService.js

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');

let sheets = null; // Google Sheets API 客戶端實例，初始化為 null
let authClient = null; // 認證後的客戶端實例，初始化為 null
let initializationPromise = null; // 用於追蹤初始化 Promise
let headerToColumnMap = {}; // 用於儲存標頭名稱到其對應的 Google Sheet 欄位字母的映射

// 定義所有我們預期在 Google Sheet 中出現的必要標頭及其在程式碼中對應的鍵名。
const REQUIRED_HEADERS_CONFIG = [
    { name: '時間戳記', key: '時間戳記' },
    { name: '姓名', key: '姓名' },
    { name: '與新人的關係', key: '與新人的關係' },
    { name: '你的 E-mail', key: 'E-mail' },
    { name: '清晰個人照片上傳', key: 'photo_url' },
    { name: '上傳語音檔', key: '上傳語音檔' },
    { name: 'AI生成影片網址', key: 'AI生成影片網址' },
    { name: 'AI生成影片檔案大小（MB）', key: '影片大小' },
    { name: 'AI生成祝福語', key: 'blessing' },
    { name: '祝福風格選擇', key: '祝福風格選擇' },
    { name: '若想自己寫，請輸入祝福語', key: '若想自己寫，請輸入祝福語' },
    { name: 'AI生成狀態', key: 'status' }
];

// 從 0-based 欄位索引轉換為 A1 表示法中的欄位字母 (例如 0 -> A, 25 -> Z, 26 -> AA)
function getColumnLetter(colIndex) {
    let result = '';
    while (colIndex >= 0) {
        result = String.fromCharCode(65 + (colIndex % 26)) + result;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return result;
}

/**
 * 寫入單一標頭到 Google Sheet 的第一行。
 * 這是 `ensureHeaders` 內部使用的輔助函式。
 * @param {string} spreadsheetId Google Sheet 的 ID。
 * @param {string} sheetName 要操作的工作表名稱。
 * @param {string} columnLetter 標頭要寫入的欄位字母 (例如 'A', 'B', 'AA')。
 * @param {string} headerValue 要寫入的標頭文字。
 * @returns {Promise<void>}
 */
async function writeHeaderToSheet(spreadsheetId, sheetName, columnLetter, headerValue) {
    const range = `${sheetName}!${columnLetter}1`;
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: [[headerValue]],
            },
        });
        console.log(`✅ 成功寫入標頭 '${headerValue}' 到 ${range}`);
    } catch (error) {
        console.error(`寫入標頭 '${headerValue}' 到 ${range} 失敗:`, error.message);
        throw error;
    }
}


/**
 * 確保 Google Sheet 中存在所有必要的標頭。如果缺少，則會自動添加它們。
 * @param {string} spreadsheetId Google Sheet 的 ID。
 * @param {string} sheetName 要操作的工作表名稱 (例如 '表單回應 1')。
 * @returns {Promise<void>}
 */
async function ensureHeaders(spreadsheetId, sheetName) {
    try {
        console.log(`正在檢查並確保工作表 '${sheetName}' 的標頭。`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1`, // 只讀取第一行
        });

        const existingHeaders = response.data.values ? response.data.values[0] : [];
        const currentHeaderMap = new Map(existingHeaders.map((header, idx) => [header.trim(), idx]));

        let nextColumnIndex = existingHeaders.length; // 從現有標頭的下一列開始添加

        // 清空並重建 headerToColumnMap
        headerToColumnMap = {};

        for (const config of REQUIRED_HEADERS_CONFIG) {
            const headerName = config.name;
            const headerKey = config.key;

            if (!currentHeaderMap.has(headerName)) {
                const columnLetter = getColumnLetter(nextColumnIndex);
                console.log(`檢測到缺失標頭: '${headerName}'。正在添加到 '${sheetName}!${columnLetter}1'...`);
                await writeHeaderToSheet(spreadsheetId, sheetName, columnLetter, headerName);
                currentHeaderMap.set(headerName, nextColumnIndex); // 更新本地映射
                nextColumnIndex++; // 準備下一個可用欄位
            }
            const colIndex = currentHeaderMap.get(headerName);
            headerToColumnMap[headerKey] = getColumnLetter(colIndex);
        }
        console.log('✅ 所有必要的標頭已確認存在。當前標頭映射:', headerToColumnMap);
    } catch (error) {
        console.error('確保 Google Sheet 標頭失敗:', error.message);
        throw new Error(`無法確保 Google Sheet 標頭: ${error.message}`);
    }
}


/**
 * 初始化 Google Sheets 客戶端。
 * 此函式負責使用服務帳戶憑證進行身份驗證，並建立 Google Sheets API 的客戶端。
 * 它會確保只執行一次初始化。
 * @returns {Promise<void>} 一個 Promise，當初始化完成時解析。
 * @throws {Error} 如果環境變數未設定或初始化過程中發生錯誤。
 */
async function initializeSheetsClient() {
    // 如果已經有初始化 Promise 在進行中或已完成，則返回該 Promise
    if (initializationPromise) {
        return initializationPromise;
    }

    // 否則，建立新的初始化 Promise
    initializationPromise = (async () => {
        try {
            const keyFileName = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (!keyFileName) {
                throw new Error("GOOGLE_APPLICATION_CREDENTIALS 環境變數未設定。");
            }

            const backendDir = path.dirname(require.main.filename);
            const absoluteKeyFilePath = path.join(backendDir, keyFileName);

            console.log("嘗試從金鑰檔案載入憑證:", absoluteKeyFilePath);

            authClient = new GoogleAuth({
                keyFile: absoluteKeyFilePath,
                // 關鍵修正：新增 Google Drive API 的寫入範圍
                scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
            });

            sheets = google.sheets({ version: 'v4', auth: authClient });
            console.log('✅ 成功初始化 Google Sheets 客戶端！');

            const googleSheetRange = process.env.GOOGLE_SHEET_RANGE || '表單回應 1!A:Z';
            const sheetName = googleSheetRange.split('!')[0];

            await ensureHeaders(process.env.GOOGLE_SHEET_ID, sheetName);

        } catch (error) {
            console.error("初始化 Google Sheets 客戶端失敗:", error);
            // 清除 initializationPromise，以便下次嘗試重新初始化
            initializationPromise = null;
            throw new Error(`無法初始化 Google Sheets 客戶端: ${error.message}`);
        }
    })(); // 立即執行這個 async 函式並將其 Promise 賦值給 initializationPromise

    return initializationPromise;
}

/**
 * 確保 Google Sheets 客戶端已初始化。
 * 在執行任何讀寫操作前調用此函式。
 */
async function ensureClientInitialized() {
    if (!sheets) {
        // 如果客戶端未初始化，則嘗試初始化
        await initializeSheetsClient();
    }
    // 如果 initializeSheetsClient() 因錯誤而將 initializationPromise 設為 null
    // 則再次檢查 sheets 是否為 null，如果仍為 null 則拋出錯誤
    if (!sheets) {
        throw new Error("Google Sheets 客戶端未能成功初始化。");
    }
}

/**
 * 獲取已認證的 Google Auth 客戶端實例。
 * @returns {Promise<GoogleAuth>} 已認證的 Google Auth 客戶端。
 * @throws {Error} 如果客戶端未初始化。
 */
async function getAuthClient() {
    await ensureClientInitialized(); // 確保客戶端已初始化
    if (!authClient) {
        throw new Error("Google Auth 客戶端未能成功初始化。");
    }
    return authClient;
}


/**
 * 從 Google Sheet 讀取數據。
 * 使用 headerToColumnMap 來確保正確解析欄位。
 * @param {string} spreadsheetId Google Sheet 的 ID。
 * @param {string} range 要讀取的範圍 (例如 'Sheet1!A:Z').
 * @returns {Promise<Array<Object>>} 解析為包含數據的物件陣列。
 * @throws {Error} 如果讀取操作失敗或客戶端未初始化。
 */
async function readGoogleSheet(spreadsheetId, range) {
    await ensureClientInitialized(); // 確保客戶端已初始化

    if (Object.keys(headerToColumnMap).length === 0) {
        console.warn("headerToColumnMap 尚未設定，可能在初始化時發生問題。嘗試重新確保標頭。");
        const sheetName = range.split('!')[0];
        await ensureHeaders(spreadsheetId, sheetName);
        if (Object.keys(headerToColumnMap).length === 0) {
            throw new Error("無法獲取標頭映射，請檢查 Google Sheets 憑證和網路連線。");
        }
    }

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return [];
        }

        const headersInSheet = rows[0].map(header => header.trim());
        const data = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowData = { _rowIndex: i + 1 }; // 添加原始行號 (基於 1)

            // 遍歷我們定義的 REQUIRED_HEADERS_CONFIG，使用其 keyName
            for (const config of REQUIRED_HEADERS_CONFIG) {
                const sheetHeaderName = config.name; // Google Sheet 上的標頭名稱
                const internalKey = config.key;      // 程式碼中使用的鍵名

                // 找到這個標頭在 sheet 中的實際列索引
                const colIndex = headersInSheet.indexOf(sheetHeaderName);

                if (colIndex !== -1 && colIndex < row.length) {
                    rowData[internalKey] = row[colIndex] || '';
                } else {
                    rowData[internalKey] = ''; // 如果欄位不存在或該行沒有數據，則為空
                }
            }
            data.push(rowData);
        }
        return data;
    } catch (error) {
        console.error('讀取 Google Sheet 失敗:', error.message);
        throw error;
    }
}


/**
 * 更新 Google Sheet 中的單元格。
 * 使用 headerToColumnMap 來確保正確定位欄位。
 * @param {string} spreadsheetId Google Sheet 的 ID。
 * @param {string} internalKey 程式碼中使用的欄位鍵名 (例如 'blessing', 'status').
 * @param {number} rowIndex 要更新的行號 (基於 1)。
 * @param {string} value 要寫入單元格的值。
 * @param {boolean} callEnsureHeaders - 是否在呼叫前檢查並確保標頭存在 (預設為 true)。
 * 在 ensureHeaders 內部呼叫時應設定為 false，以避免無限遞迴。
 * @returns {Promise<void>}
 * @throws {Error} 如果更新操作失敗或客戶端未初始化。
 */
async function updateGoogleSheetCell(spreadsheetId, internalKey, rowIndex, value, callEnsureHeaders = true) {
    await ensureClientInitialized(); // 確保客戶端已初始化

    if (callEnsureHeaders && Object.keys(headerToColumnMap).length === 0) {
        console.warn("headerToColumnMap 尚未設定，可能在初始化時發生問題。嘗試重新確保標頭。");
        const sheetName = process.env.GOOGLE_SHEET_RANGE.split('!')[0];
        await ensureHeaders(spreadsheetId, sheetName);
        if (Object.keys(headerToColumnMap).length === 0) {
            throw new Error("無法獲取標頭映射，請檢查 Google Sheets 憑證和網路連線。");
        }
    }

    const columnLetter = headerToColumnMap[internalKey];
    if (!columnLetter) {
        console.error(`未找到鍵名 '${internalKey}' 對應的欄位字母。請檢查 REQUIRED_HEADERS_CONFIG。`);
        throw new Error(`無法更新：欄位 '${internalKey}' 不存在於標頭映射中。`);
    }

    const range = `${process.env.GOOGLE_SHEET_RANGE.split('!')[0]}!${columnLetter}${rowIndex}`; // 使用提取的工作表名稱和動態欄位字母

    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: [[value]],
            },
        });
        console.log(`✅ 成功更新 Google Sheet 儲存格 ${range} (鍵: ${internalKey}) 為 "${value}"`);
    } catch (error) {
        console.error(`更新 Google Sheet 儲存格 ${range} (鍵: ${internalKey}) 失敗:`, error.message);
        throw error;
    }
}

module.exports = {
    initializeSheetsClient,
    readGoogleSheet,
    updateGoogleSheetCell,
    getAuthClient, // 新增：匯出獲取認證客戶端的函式
    getColumnLetter
};
