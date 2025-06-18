const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保這裡引入的是 promise-based 的連接池
const { google } = require('googleapis');
const validator = require('validator');
const path = require('path'); // 用於解析金鑰檔案路徑
const moment = require('moment'); // 用於日期時間處理 (如果需要驗證 Google Sheet 中的日期)
// Google Sheets API 認證設定
const KEYFILE_PATH = process.env.GOOGLE_SHEETS_KEY_FILE ? path.resolve(process.env.GOOGLE_SHEETS_KEY_FILE) : null; // 處理未設定環境變數的情況
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]; // 同步只需要讀取權限
// 統一處理錯誤響應
const sendError = (res, routeName, error, message = "伺服器內部錯誤", statusCode = 500) => {
    console.error(`[${routeName}] 錯誤:`, error);
    const errorMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message}`;
    res.status(statusCode).json({
        message: errorMessage, code: error.code || 'UNKNOWN_ERROR', // details: process.env.NODE_ENV !== 'production' ? error.stack : undefined // 開發環境提供堆疊追蹤
    });
};
// 同步 Google Sheet 賓客資料
// 注意：前端傳來的 ID 現在是 project_id
router.post("/:id", async (req, res) => {
    const projectId = parseInt(req.params.id); // 參數 id 現在是 project_id
    console.log(`[SYNC] 開始同步專案 ID ${projectId} 的資料`); // 修改日誌
    // 1. 驗證 id
    if (isNaN(projectId) || projectId <= 0) {
        console.warn(`[SYNC] 無效的專案 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的專案 ID" });
    }
    // 2. 檢查 Google Sheets 金鑰檔案路徑
    if (!KEYFILE_PATH) {
        console.error("[SYNC] 伺服器配置錯誤：缺少 Google Sheets 金鑰檔案路徑 (GOOGLE_SHEETS_KEY_FILE 環境變數)");
        return res.status(500).json({ message: "伺服器配置錯誤：缺少 Google Sheets 金鑰檔案" });
    }
    let connection; // 聲明連接變量以便在 finally 區塊釋放
    try {
        connection = await pool.getConnection(); // 從連接池獲取連接
        await connection.beginTransaction(); // 開始事務，確保賓客資料刪除和插入的原子性
        // 3. 從資料庫獲取 Google Sheet 連結 - 從 wedding_projects 表獲取
        const [projectResults] = await connection.query( // 使用 connection
            "SELECT google_sheet_link FROM wedding_projects WHERE project_id = ?", // <--- 這裡修正！
            [projectId] // 使用 project_id
        );
        if (projectResults.length === 0 || !projectResults[0].google_sheet_link) {
            console.warn(`[SYNC] 找不到專案 ${projectId} 或其 Google Sheet 連結`); // 修改日誌訊息
            await connection.rollback(); // 回滾事務
            return res.status(404).json({ message: "該專案尚無 Google Sheet 連結" }); // 修改錯誤訊息
        }
        const googleSheetLink = projectResults[0].google_sheet_link;
        let sheetId;
        const match = googleSheetLink.match(/spreadsheets\/d\/(.*?)\//);
        if (!match || match.length < 2 || !match[1]) {
            console.warn(`[SYNC] 專案 ${projectId} 的 Google Sheet 連結格式無效:`, googleSheetLink); // 修改日誌訊息
            await connection.rollback(); // 回滾事務
            return res.status(400).json({ message: "無效的 Google Sheet 連結格式" });
        }
        sheetId = match[1];
        console.log(`[SYNC] 專案 ${projectId} 的 Google Sheet ID: ${sheetId}`); // 修改日誌訊息
        // 4. Google Sheets API 認證和客戶端初始化
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: SCOPES,
        });
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });
        console.log(`[SYNC] Google Sheets API 客戶端已初始化`);
        // 5. 從 Google Sheet 讀取資料
        const range = "工作表1!A2:I"; // 假設資料從第二行 A 到 I 列開始
        console.log(`[SYNC] 從 Google Sheet ${sheetId} 讀取範圍 ${range}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });
        const sheetDataValues = response.data.values || [];
        console.log(`[SYNC] 從 Google Sheet 讀取到 ${sheetDataValues.length} 行資料`);
        const guestsToUpsert = [];
        const failedRowParsing = [];
        // 6. 處理 Google Sheet 讀取的資料，準備 UPSERT
        for (let i = 0; i < sheetDataValues.length; i++) {
            const row = sheetDataValues[i];
            // console.log(`[SYNC] 處理 Google Sheet 第 ${i + 2} 行:`, row); // 如果需要詳細日誌，可以取消註解
            // 確保每一行都有足夠的欄位 (至少到 Email 欄位，即第 9 列 / 索引 8)
            const minColumnsRequired = 9;
            if (row.length < minColumnsRequired) {
                console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行：欄位不足 (${row.length} < ${minColumnsRequired})`, row);
                failedRowParsing.push({ rowIndex: i + 2, rowData: row, reason: "欄位不足" });
                continue;
            }
            // 從 row 中提取並清理數據，確保數據類型正確
            const googleSheetGuestId = row[0] ? String(row[0]).trim() : "";
            const guestName = row[1] ? String(row[1]).trim() : "";
            const relationshipWithGroom = row[2] ? String(row[2]).trim() : "";
            const relationshipWithBride = row[3] ? String(row[3]).trim() : "";
            const relationshipWithCouple = row[4] ? String(row[4]).trim() : "";
            const guestDescription = row[5] ? String(row[5]).trim() : "";
            const sharedMemories = row[6] ? String(row[6]).trim() : "";
            const message = row[7] ? String(row[7]).trim() : "";
            const email = row[8] ? String(row[8]).trim() : "";
            // 如果賓客 ID 或 Email 為空，則跳過此行 (ID 是唯一的識別鍵，Email 是必要欄位)
            if (!googleSheetGuestId) {
                console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行：賓客 ID 為空`, row);
                failedRowParsing.push({ rowIndex: i + 2, rowData: row, reason: "賓客 ID 為空" });
                continue;
            }
            if (!email) {
                console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行 (賓客 ID: ${googleSheetGuestId})：Email 為空`, row);
                failedRowParsing.push({ rowIndex: i + 2, googleSheetGuestId, guestName, reason: "Email 為空" });
                continue;
            }
            // 將處理後的數據添加到 UPSERT 列表
            guestsToUpsert.push([
                googleSheetGuestId,
                guestName,
                email,
                relationshipWithGroom,
                relationshipWithBride,
                relationshipWithCouple,
                guestDescription,
                sharedMemories,
                message,
                0, // is_sent 預設為 0
                projectId // 關聯到新的 project_id
            ]);
        }
        // 7. 在 UPSERT 前，先刪除該專案下所有不在本次同步列表中的賓客
        // 這樣可以確保資料庫中的賓客與 Google Sheet 保持一致 (如果 Google Sheet 有刪除操作)
        if (sheetDataValues.length > 0) {
            // 只有當 Google Sheet 非空時才執行刪除不在列表中的賓客
            const guestIdsFromSheet = guestsToUpsert.map(guest => guest[0]); // 獲取所有來自 Sheet 的 googleSheetGuestId
            if (guestIdsFromSheet.length > 0) {
                const deleteQuery = `
                    DELETE FROM guests
                    WHERE project_id = ? AND google_sheet_guest_id NOT IN (?)
                `;
                console.log(`[SYNC] 準備刪除專案 ${projectId} 下不在本次同步列表中的賓客`);
                // 注意：使用 IN (?) 參數綁定時，需要將陣列傳遞給 query 函數的第二個參數
                const [deleteResult] = await connection.query(deleteQuery, [projectId, guestIdsFromSheet]);
                console.log(`[SYNC] 刪除 ${deleteResult.affectedRows} 筆不在列表中的賓客`);
            }
        } else {
            // 如果 Google Sheet 是空的，並且資料庫中有該專案的賓客，則清空資料庫中的賓客
            const [countCheck] = await connection.query('SELECT COUNT(*) AS count FROM guests WHERE project_id = ?', [projectId]);
            if (countCheck[0].count > 0) {
                console.log(`[SYNC] Google Sheet 為空，準備刪除專案 ${projectId} 下所有賓客`);
                const [deleteAllResult] = await connection.query('DELETE FROM guests WHERE project_id = ?', [projectId]);
                console.log(`[SYNC] 刪除 ${deleteAllResult.affectedRows} 筆賓客 (清空操作)`);
            } else {
                console.log(`[SYNC] Google Sheet 為空，且資料庫中專案 ${projectId} 無賓客，無需刪除`);
            }
        }
        let insertedCount = 0;
        let updatedCount = 0;
        // 8. 執行批量 UPSERT (插入或更新)
        if (guestsToUpsert.length > 0) {
            // placeholders 中的字段順序要對應 guestsToUpsert 數組元素的順序
            const placeholders = guestsToUpsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const queryValues = guestsToUpsert.flat(); // 將二維陣列扁平化成一維
            const upsertQuery = `
                INSERT INTO guests (google_sheet_guest_id, guest_name, email, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message, is_sent, project_id) -- <--- 這裡修正 wedding_couple_id 為 project_id
                VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE
                    guest_name = VALUES(guest_name),
                    email = VALUES(email),
                    relationshipWithGroom = VALUES(relationshipWithGroom),
                    relationshipWithBride = VALUES(relationshipWithBride),
                    relationshipWithCouple = VALUES(relationshipWithCouple),
                    guestDescription = VALUES(guestDescription),
                    sharedMemories = VALUES(sharedMemories),
                    message = VALUES(message),
                    updated_at = CURRENT_TIMESTAMP; -- 更新 updated_at
            `;
            console.log(`[SYNC] 準備執行批量 UPSERT，共 ${guestsToUpsert.length} 筆資料`);
            const [result] = await connection.query(upsertQuery, queryValues);
            // affectedRows = (插入的行數) + (更新的行數)
            // changedRows = (實際發生資料變更的行數)
            insertedCount = result.affectedRows - result.changedRows;
            updatedCount = result.changedRows;
            console.log(`[SYNC] 批量 UPSERT 完成：插入 ${insertedCount} 筆，更新 ${updatedCount} 筆。`);
        } else {
            console.log(`[SYNC] Google Sheet 中沒有有效賓客資料可供同步，沒有執行 UPSERT。`);
        }
        await connection.commit(); // 提交事務
        // 9. 返回同步結果摘要
        const totalFailed = failedRowParsing.length;
        console.log(`[SYNC] 同步流程完成。總計：插入 ${insertedCount} 筆，更新 ${updatedCount} 筆，解析失敗 ${totalFailed} 筆。`);
        res.status(200).json({
            message: `資料同步完成。插入 ${insertedCount} 筆，更新 ${updatedCount} 筆，解析失敗 ${totalFailed} 筆。`,
            insertedCount: insertedCount,
            updatedCount: updatedCount,
            failedRowParsing: failedRowParsing.map(f => ({ ...f, rowData: undefined })) // 不回傳原始行資料
        });
    } catch (error) {
        if (connection) await connection.rollback(); // 回滾事務
        // 捕獲所有未預期的錯誤，包括 Google API 和資料庫操作錯誤
        console.error("[SYNC] 同步 Google Sheets 資料時發生未預期的錯誤:", error);
        // 區分 Google API 錯誤和資料庫錯誤
        if (error.message.includes('Google Sheets API')) {
            sendError(res, `POST /sync-sheet-data/${projectId}`, error, "與 Google Sheets 溝通失敗，請檢查連結和權限", 500);
        } else {
            sendError(res, `POST /sync-sheet-data/${projectId}`, error, "同步資料時發生伺服器內部錯誤", 500);
        }
    } finally {
        if (connection) connection.release(); // 釋放連接
    }
});
module.exports = router;