// backend/AI/generateAvatar.js

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

const path = require('path');
// 載入環境變數 (例如 DID_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEETS_KEY_FILE)
// 使用 path.resolve 確保 dotenv.config 獲得絕對路徑
// 根據使用者說明，.env 檔案位於 backend 資料夾內，所以路徑是 ../.env
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // <-- 修正這裡的路徑！

// 檢查 dotenv 是否成功解析了 .env 檔案
if (dotenvResult.error) {
    console.error("dotenv 載入 .env 檔案時發生錯誤:", dotenvResult.error);
} else if (dotenvResult.parsed) {
    console.log("dotenv 成功解析 .env 檔案。載入變數數量:", Object.keys(dotenvResult.parsed).length);
} else {
    console.log("dotenv 未解析任何變數，可能檔案為空或格式錯誤。");
}


const { google } = require('googleapis');
const axios = require('axios'); 

// 從環境變數獲取 API 金鑰
const DID_API_KEY = process.env.DID_API_KEY;
// 從環境變數獲取 Google Sheet ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // 注意：這裡應該是 GOOGLE_SHEET_ID
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


// 檢查 D-ID 金鑰是否存在
if (!DID_API_KEY) {
    console.error("錯誤：未找到 DID_API_KEY 環境變數。請檢查 .env 檔案的路徑與內容。");
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


// D-ID API 相關設定
const DID_API_URL = 'https://api.d-id.com/talks';
const DID_HEADERS = {
    'Authorization': `ApiKey ${DID_API_KEY}`,
    'Content-Type': 'application/json',
};

// Google Sheets 服務帳戶驗證
const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_SHEETS_KEY_FILE_PATH, // 直接使用環境變數提供的絕對路徑
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// --- 設定你的 Google Sheet 資訊 (需與 generateBlessings.js 一致) ---
// SPREADSHEET_ID 已從環境變數讀取
const SHEET_NAME = '表單回應 1'; // <-- 確認這裡，應該是 '表單回應 1'
const RANGE = `${SHEET_NAME}!A:Z`; // 讀取整個工作表範圍

// 賓客數據的欄位映射 (與 Google Sheet 表頭對應)
// 這裡的值 (value) 應該是 Google Sheet 中「修剪過空格後」的精確表頭文字
const HEADER_MAPPING = {
    timestamp: '時間戳記', // 從 googleSheetsService.js 複製過來，確保一致
    name: '姓名',
    relation: '與新人的關係', // 移除表頭中的多餘空格
    email: 'Email',
    blessing_style_selection: '祝福風格選擇', // 移除表頭中的多餘空格
    blessing_suggestion: '若想自己寫，請輸入祝福語', 
    photo_url: '清晰個人照片上傳', // 移除表頭中的多餘空格
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
                // 使用 HEADER_MAPPING 來匹配表頭
                const mappedEntry = Object.entries(HEADER_MAPPING).find(([key, value]) => value.toLowerCase() === trimmedHeader.toLowerCase());
                if (mappedEntry) {
                    const englishKey = mappedEntry[0];
                    rowObject[englishKey] = row[index] || '';
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
            range: `${SHEET_NAME}!1:1`,
        });
        const headers = headersResponse.data.values[0];

        // 查找實際的列索引，無論是根據 HEADER_MAPPING 中的值還是 internalColumnName
        // ！！！關鍵修正：在比對前，修剪從 Google Sheet 讀取的表頭字符串！！！
        const columnIndex = headers.findIndex(header => header.trim().toLowerCase() === sheetColumnName.toLowerCase()); // ADDED TRIM HERE

        if (columnIndex === -1) {
            console.error(`錯誤：未找到欄位名稱 '${sheetColumnName}' (內部名稱: ${internalColumnName})。`);
            return;
        }

        const columnLetter = String.fromCharCode(65 + columnIndex);
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
 * 使用 D-ID API 生成 AI 影片
 * @param {string} photoUrl 說話者圖像 URL (通常是靜態頭像照片)
 * @param {string} text 要讓 AI 說出的文字 (祝福語)
 * @param {string} audioUrl 預錄的音檔 URL (如果提供，則優先於文字轉語音)
 * @returns {string} 生成的影片 URL
 */
async function generateDIDVideo(photoUrl, text, audioUrl = null) {
    console.log(`為圖像 ${photoUrl} 生成 D-ID 影片...`);
    try {
        let payload;
        if (audioUrl && audioUrl.trim() !== '') {
            // 如果提供了 audioUrl，則使用 audio_url
            payload = {
                script: {
                    type: "audio",
                    audio_url: audioUrl
                },
                source_url: photoUrl,
            };
            console.log(`使用音檔 URL: ${audioUrl} 生成 D-ID 影片。`);
        } else {
            // 否則，使用文字轉語音
            payload = {
                script: {
                    type: "text",
                    input: text,
                    voice_id: "zh-CN-XiaoxiaoNeural", 
                },
                source_url: photoUrl,
            };
            console.log(`使用文字轉語音生成 D-ID 影片，文本: "${text}"`);
        }


        const response = await axios.post(DID_API_URL, payload, { headers: DID_HEADERS });

        const talkId = response.data.id;
        console.log(`D-ID Talk ID: ${talkId}`);

        let videoUrl = null;
        let attempt = 0;
        const maxAttempts = 10; 
        const pollInterval = 5000; 

        while (!videoUrl && attempt < maxAttempts) {
            console.log(`輪詢 D-ID 影片狀態 (嘗試 ${attempt + 1}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            const talkStatusResponse = await axios.get(`${DID_API_URL}/${talkId}`, { headers: DID_HEADERS });
            if (talkStatusResponse.data.status === 'done' && talkStatusResponse.data.result_url) {
                videoUrl = talkStatusResponse.data.result_url;
                console.log(`D-ID 影片生成完成！ URL: ${videoUrl}`);
            } else if (talkStatusResponse.data.status === 'started' || talkStatusResponse.data.status === 'in_progress') {
                // 繼續等待
            } else {
                console.error(`D-ID 影片生成失敗，狀態: ${talkStatusResponse.data.status}`);
                break; 
            }
            attempt++;
        }

        if (!videoUrl) {
            console.error(`D-ID 影片生成超時或失敗，無法獲取影片 URL。`);
            return null;
        }

        return videoUrl;
    } catch (error) {
        console.error(`調用 D-ID API 失敗 (${photoUrl}):`, error.message);
        if (error.response) {
            console.error('D-ID API 錯誤響應數據:', error.response.data);
        }
        return null; 
    }
}

/**
 * 主函數：處理 AI 影片生成流程
 * @param {Array<number>} selectedGuestIndexes 選擇要處理的賓客在原始數據陣列中的索引。
 * 注意: 這個 main 函數現在接受 selectedGuestIndexes 參數，
 * 並且不會在模組載入時自動執行。
 */
async function processAvatars(selectedGuestIndexes = []) {
    console.log("開始處理選定賓客的 AI 影片生成...");

    try {
        const guests = await readSheet(); // 使用本地 readSheet
        if (guests.length === 0) {
            console.log("沒有賓客數據可供處理。");
            return { success: true, message: "沒有賓客數據可供處理。" };
        }

        let processedCount = 0;
        const results = [];

        for (const originalIndex of selectedGuestIndexes) {
            const guest = guests[originalIndex]; // 直接使用索引獲取賓客數據

            if (!guest) {
                console.warn(`跳過索引 ${originalIndex}: 找不到對應的賓客數據。`);
                results.push({ index: originalIndex, success: false, message: `找不到賓客數據。` });
                continue;
            }

            // 檢查 status 是否為 'blessing_done' 或 'blessing_failed' 且 video_url 欄位是否為空
            // 已移除對 audio_consent 和 avatar_consent 的檢查
            const shouldProcess = 
                (!guest.video_url || guest.video_url.trim() === '') && 
                (guest.status === 'blessing_done' || guest.status === 'blessing_failed');

            if (shouldProcess) {
                console.log(`處理賓客影片: ${guest.name} (原始索引: ${originalIndex}, 狀態: ${guest.status})`);

                // 檢查 photo_url 和 blessing 是否存在
                if (!guest.photo_url || guest.photo_url.trim() === '') {
                    console.warn(`跳過 ${guest.name}: photo_url 不存在。`);
                    results.push({ index: originalIndex, success: false, message: `跳過處理: 照片 URL 不存在。` });
                    await updateSheetCell(originalIndex, 'status', 'video_failed'); // 可以更新狀態
                    continue;
                }
                // 如果沒有 audio_url 但有 blessing，則使用 blessing
                if (!guest.audio_url || guest.audio_url.trim() === '') {
                    if (!guest.blessing || guest.blessing.trim() === '') {
                        console.warn(`跳過 ${guest.name}: blessing 和 audio_url 都不存在。請先運行 generateBlessings.js。`);
                        results.push({ index: originalIndex, success: false, message: `跳過處理: 無祝福語或音檔。` });
                        await updateSheetCell(originalIndex, 'status', 'video_failed'); // 可以更新狀態
                        continue;
                    }
                }
                
                const videoUrl = await generateDIDVideo(guest.photo_url, guest.blessing, guest.audio_url);

                if (videoUrl) {
                    // 更新 Google Sheet
                    await updateSheetCell(originalIndex, 'video_url', videoUrl);
                    await updateSheetCell(originalIndex, 'status', 'done');
                    processedCount++;
                    results.push({ index: originalIndex, success: true, videoUrl: videoUrl });
                } else {
                    console.error(`未能為 ${guest.name} 生成影片。`);
                    // 可以選擇更新狀態為 'failed'
                    await updateSheetCell(originalIndex, 'status', 'video_failed');
                    results.push({ index: originalIndex, success: false, message: `未能生成影片。` });
                }
            } else {
                let skipReason = [];
                if (guest.video_url && guest.video_url.trim() !== '') skipReason.push('影片已存在');
                if (guest.status !== 'blessing_done' && guest.status !== 'blessing_failed') skipReason.push(`狀態不符 (${guest.status})`);
                console.log(`跳過賓客: ${guest.name || '未定義'} (原始索引: ${originalIndex}) - ${skipReason.join('，')}。`);
                results.push({ index: originalIndex, success: false, message: `跳過處理: ${skipReason.join('，')}` });
            }
        }
        console.log(`AI 影片生成流程完成。共處理了 ${processedCount} 位賓客。`);
        return { success: true, processedCount, results };
    } catch (error) {
        console.error('執行 AI 影片生成流程時發生錯誤:', error.message);
        return { success: false, message: `AI 影片生成流程失敗: ${error.message}` };
    }
}

module.exports = {
    processAvatars
};

// 移除 main() 的自動呼叫
// main();
