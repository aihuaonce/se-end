// backend/AI/generateBlessings.js

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

// 引入 path 模組來處理檔案路徑。
const path = require('path');
// 從 googleSheetsService.js 導入必要的 Google Sheets 函數。
// readGoogleSheet 用於讀取賓客數據，updateGoogleSheetCell 用於更新單元格。
const { readGoogleSheet, updateGoogleSheetCell } = require('./googleSheetsService');

// 從環境變數獲取 Google Gemini API 金鑰和 Google Sheet ID。
// 這些變數應該已經由 server.js 中的 dotenv 載入。
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID; // 確保這裡也能獲取到 GOOGLE_SHEET_ID

// 提前檢查 GOOGLE_GEMINI_API_KEY 金鑰是否存在，若缺失則發出警告。
if (!GOOGLE_GEMINI_API_KEY) {
    console.error("錯誤：未找到 GOOGLE_GEMINI_API_KEY 環境變數。請檢查 .env 檔案是否正確載入。");
    // 此處不強制退出，允許後續函數返回錯誤，以便調用者能捕獲並處理。
}
// 提前檢查 GOOGLE_SHEET_ID 金鑰是否存在
if (!GOOGLE_SHEET_ID) {
    console.error("錯誤：未找到 GOOGLE_SHEET_ID 環境變數。請檢查 .env 檔案是否正確載入。");
}


/**
 * 使用 Google Gemini API 生成祝福語。
 * 函式會根據賓客提供的資訊（姓名、關係、建議和風格）動態構建一個提示，
 * 然後調用 Gemini API 來獲取生成的祝福語。
 * @param {string} name 賓客姓名。
 * @param {string} relation 賓客與新人的關係。
 * @param {string} blessingSuggestion 賓客提供的祝福語建議 (來自試算表)。
 * @param {string} blessingStyleSelection 賓客選擇的祝福風格 (來自試算表)。
 * @returns {Promise<string>} 解析為生成的祝福語字串。
 * @throws {Error} 如果 Gemini API 金鑰缺失、API 請求失敗或響應無效。
 */
async function generateBlessingWithGemini(name, relation, blessingSuggestion, blessingStyleSelection) {
    // 再次檢查 GOOGLE_GEMINI_API_KEY，確保在 API 調用前金鑰可用。
    if (!GOOGLE_GEMINI_API_KEY) {
        throw new Error("GOOGLE_GEMINI_API_KEY 未設定，無法調用 Gemini API。");
    }

    try {
        let prompt = `請為以下這位賓客生成一段簡短、溫馨、適合在婚禮互動牆上播放的祝福語：\n\n`;
        prompt += `賓客姓名：${name}\n`;
        prompt += `與新人的關係：${relation}\n`;

        // 如果有賓客提供的祝福語建議，則加入提示中。
        if (blessingSuggestion && blessingSuggestion.trim() !== '') {
            prompt += `賓客提供的祝福語建議：${blessingSuggestion}\n`;
        }
        // 如果有賓客選擇的祝福風格，則加入提示中。
        if (blessingStyleSelection && blessingStyleSelection.trim() !== '') {
            prompt += `祝福語風格：${blessingStyleSelection}\n`;
        }
        prompt += `\n祝福語應自然流暢，並以第一人稱（AI 賓客分身）口吻表達。不需包含稱謂，直接開始祝福語內容。字數限制在 50-80 字之間。`;

        console.log(`為賓客 '${name}' 生成祝福語 (風格: ${blessingStyleSelection || '未指定'}) 使用 Gemini API...`);
        // console.log(`完整的 Gemini 提示:\n${prompt}`); // 調試時可啟用此行查看完整提示。

        // 構建聊天歷史 (目前只有一個用戶消息)。
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        // 構建 API 請求的 Payload。
        const payload = {
            contents: chatHistory
        };

        // Gemini API 的端點 URL。
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

        // 發送 HTTP POST 請求到 Gemini API。
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 檢查 API 響應狀態碼，如果不是 2xx 則拋出錯誤。
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Gemini API 請求失敗，狀態碼:", response.status, "錯誤訊息:", errorBody);
            throw new Error(`Gemini API 請求失敗: ${errorBody.error?.message || response.statusText}`);
        }

        // 解析 API 響應的 JSON 數據。
        const result = await response.json();

        // 檢查響應結構，確保有有效的生成內容。
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const blessing = result.candidates[0].content.parts[0].text;
            console.log(`為賓客 '${name}' 生成的祝福語 (來自 Gemini): "${blessing}"`);
            return blessing;
        } else {
            console.warn("Gemini API 響應結構異常或內容缺失:", result);
            throw new Error("未能從 Gemini API 獲取有效內容。");
        }
    } catch (error) {
        console.error(`調用 Gemini API 為賓客 '${name}' 生成祝福語失敗:`, error.message);
        throw error; // 重新拋出錯誤，讓調用者處理。
    }
}

/**
 * 主函式：處理祝福語生成流程。
 * 從 Google Sheet 讀取賓客數據，對選定的賓客生成祝福語，
 * 然後將生成的祝福語和處理狀態更新回 Google Sheet。
 * @param {Array<number>} selectedGuestIndexes 選擇要處理的賓客在原始數據陣列中的行索引 (基於 1)。
 * @returns {Promise<Object>} 包含處理結果的物件，如 success, processedCount 和 results。
 */
async function processBlessings(selectedGuestIndexes = []) {
    console.log("開始處理選定賓客的祝福語生成流程...");

    // 在流程開始時檢查 API 金鑰和 Sheet ID，若缺失則直接返回錯誤訊息，避免不必要的處理。
    if (!GOOGLE_GEMINI_API_KEY) {
        const errorMessage = "未找到 GOOGLE_GEMINI_API_KEY 環境變數，無法執行祝福語生成流程。";
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }
    if (!GOOGLE_SHEET_ID) {
        const errorMessage = "未找到 GOOGLE_SHEET_ID 環境變數，無法執行祝福語生成流程。";
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }

    try {
        // 從 googleSheetsService 導入的 readGoogleSheet 函數，讀取已映射的賓客數據。
        const guests = await readGoogleSheet(GOOGLE_SHEET_ID, '表單回應 1!A:Z');
        if (guests.length === 0) {
            console.log("Google Sheet 中沒有賓客數據可供處理。");
            return { success: true, message: "沒有賓客數據可供處理。" };
        }

        let processedCount = 0;
        const results = [];

        // 迭代處理每個選定的賓客索引。
        for (const originalIndex of selectedGuestIndexes) {
            // 使用 find 方法，根據 _rowIndex 找到 Google Sheet 中對應的賓客數據。
            const guest = guests.find(g => g._rowIndex === originalIndex);

            if (!guest) {
                console.warn(`跳過索引 ${originalIndex}: 找不到對應的賓客數據。這可能表示該行已被刪除或索引無效。`);
                results.push({ index: originalIndex, success: false, message: `找不到賓客數據。` });
                continue; // 繼續處理下一個賓客。
            }

            // 檢查賓客的姓名或關係是否缺失，這些是生成祝福語的必要資訊。
            // 使用標準化後的欄位名稱 (已在 googleSheetsService.js 中 trimmed)
            if (!guest['姓名'] || guest['姓名'].trim() === '' || !guest['與新人的關係'] || guest['與新人的關係'].trim() === '') {
                console.warn(`跳過賓客: '${guest['姓名'] || '未定義姓名'}' (原始索引: ${originalIndex}) - 姓名或關係缺失，無法生成祝福語。`);
                results.push({ index: originalIndex, success: false, message: `跳過處理: 姓名或關係缺失。` });
                // 將狀態更新為 'blessing_failed' 以標記此問題。
                // 修正: 呼叫 updateGoogleSheetCell 時，使用 internalKey 'status'
                await updateGoogleSheetCell(GOOGLE_SHEET_ID, 'status', originalIndex, 'blessing_failed').catch(err =>
                    console.error(`更新賓客 '${guest['姓名']}' (索引: ${originalIndex}) 狀態為 'blessing_failed' 失敗:`, err.message));
                continue; // 繼續處理下一個賓客。
            }

            // 移除這段條件，允許重複生成祝福語
            // if (guest['blessing'] && guest['blessing'].trim() !== '' && guest['status'] !== 'blessing_failed') {
            //     console.log(`賓客 '${guest['姓名']}' (原始索引: ${originalIndex}) 已有祝福語且狀態良好，跳過生成。`);
            //     results.push({ index: originalIndex, success: true, blessing: guest['blessing'], message: '祝福語已存在。' });
            //     continue;
            // }

            console.log(`開始為賓客 '${guest['姓名']}' (原始索引: ${originalIndex}) 生成或重新生成祝福語...`);
            try {
                // 調用 Gemini API 生成祝福語。
                // 使用標準化後的欄位名稱 (已在 googleSheetsService.js 中 trimmed)
                const blessing = await generateBlessingWithGemini(
                    guest['姓名'],
                    guest['與新人的關係'],
                    guest['若想自己寫，請輸入祝福語'], // 賓客提供的祝福語建議
                    guest['祝福風格選擇'] // 賓客選擇的祝福風格
                );

                // 更新 Google Sheet 中該賓客的祝福語和狀態。
                // 修正: 呼叫 updateGoogleSheetCell 時，使用 internalKey 'blessing' 和 'status'
                await updateGoogleSheetCell(GOOGLE_SHEET_ID, 'blessing', originalIndex, blessing); // 欄位是 'blessing'
                await updateGoogleSheetCell(GOOGLE_SHEET_ID, 'status', originalIndex, 'blessing_done'); // 欄位是 'status'
                processedCount++;
                results.push({ index: originalIndex, success: true, blessing: blessing });
            } catch (error) {
                // 如果 Gemini API 失敗，記錄錯誤並更新狀態為 'blessing_failed'。
                console.error(`為賓客 '${guest['姓名']}' (原始索引: ${originalIndex}) 生成祝福語失敗 (Gemini API 錯誤): ${error.message}`);
                // 將狀態更新為 'blessing_failed'
                // 修正: 呼叫 updateGoogleSheetCell 時，使用 internalKey 'status'
                await updateGoogleSheetCell(GOOGLE_SHEET_ID, 'status', originalIndex, 'blessing_failed').catch(err =>
                    console.error(`更新賓客 '${guest['姓名']}' (索引: ${originalIndex}) 狀態為 'blessing_failed' 失敗:`, err.message));
                results.push({ index: originalIndex, success: false, message: `生成祝福語失敗: ${error.message}` });
            }
        }
        console.log(`祝福語生成流程完成。共成功處理了 ${processedCount} 位賓客。`);
        return { success: true, processedCount, results };
    } catch (error) {
        // 捕獲在整個 `processBlessings` 函式執行過程中可能發生的任何頂層錯誤（例如讀取 Google Sheet 失敗）。
        console.error('執行祝福語生成流程時發生整體錯誤:', error.message);
        return { success: false, message: `祝福語生成流程失敗: ${error.message}` };
    }
}

module.exports = {
    processBlessings
};
