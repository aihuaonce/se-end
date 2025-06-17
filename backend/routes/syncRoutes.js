// backend/routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保這裡引入的是 promise-based 的連接池 (即 mysql2 模組的 pool.promise() 或類似配置)
const { google } = require('googleapis');
const validator = require('validator');
const path = require('path'); // 用於解析金鑰檔案路徑

// Google Sheets API 認證設定
// 推薦使用 path.resolve 或 path.join 確保路徑在任何作業系統上都正確
// 並確保 GOOGLE_SHEETS_KEY_FILE 環境變數指向金鑰檔案的絕對路徑或相對於專案根目錄的路徑
const KEYFILE_PATH = process.env.GOOGLE_SHEETS_KEY_FILE
    ? path.resolve(process.env.GOOGLE_SHEETS_KEY_FILE)
    : null; // 處理未設定環境變數的情況

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]; // 讀寫 Google Sheet 權限

router.post("/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`[SYNC] 開始同步客戶 ID ${id} 的資料`);

    // 1. 簡單驗證 id 是否為數字
    if (!validator.isInt(id)) {
        console.warn(`[SYNC] 客戶 ID ${id} 無效`);
        return res.status(400).json({ message: "無效的客戶 ID" });
    }
    const weddingCoupleId = parseInt(id);

    // 2. 檢查 Google Sheets 金鑰檔案路徑
    if (!KEYFILE_PATH) {
        console.error("[SYNC] 伺服器配置錯誤：缺少 Google Sheets 金鑰檔案路徑 (GOOGLE_SHEETS_KEY_FILE 環境變數)");
        return res.status(500).json({ message: "伺服器配置錯誤：缺少 Google Sheets 金鑰檔案" });
    }

    try {
        // 3. Google Sheets API 認證和客戶端初始化
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILE_PATH,
            scopes: SCOPES,
        });
        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });
        console.log(`[SYNC] Google Sheets API 客戶端已初始化`);

        // 4. 從資料庫獲取 Google Sheet 連結
        const [coupleResults] = await pool.query(
            "SELECT google_sheet_link FROM wedding_couples WHERE id = ?",
            [weddingCoupleId]
        );

        if (coupleResults.length === 0 || !coupleResults[0].google_sheet_link) {
            console.warn(`[SYNC] 找不到客戶 ${weddingCoupleId} 或其 Google Sheet 連結`);
            return res.status(404).json({ message: "該客戶尚無 Google Sheet 連結" });
        }

        const googleSheetLink = coupleResults[0].google_sheet_link;
        let sheetId;
        const match = googleSheetLink.match(/spreadsheets\/d\/(.*?)\//);
        if (!match || match.length < 2 || !match[1]) {
            console.warn(`[SYNC] 客戶 ${weddingCoupleId} 的 Google Sheet 連結格式無效:`, googleSheetLink);
            return res.status(400).json({ message: "無效的 Google Sheet 連結格式" });
        }
        sheetId = match[1];
        console.log(`[SYNC] 客戶 ${weddingCoupleId} 的 Google Sheet ID: ${sheetId}`);

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

            // 確保每一行都有足夠的欄位
            // 根據您提供的格式，從賓客編號到電子郵件地址共有 9 列 (A 到 I)
            if (row.length < 9) {
                console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行：欄位不足 (${row.length} < 9)`, row);
                failedRowParsing.push({ rowIndex: i + 2, rowData: row, reason: "欄位不足" });
                continue;
            }

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
                weddingCoupleId
            ]);
        }

        let insertedCount = 0;
        let updatedCount = 0;

        // 7. 執行批量 UPSERT
        if (guestsToUpsert.length > 0) {
            const placeholders = guestsToUpsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const queryValues = guestsToUpsert.flat(); // 將二維陣列扁平化成一維

            const upsertQuery = `
                INSERT INTO guests (google_sheet_guest_id, guest_name, email, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message, is_sent, wedding_couple_id)
                VALUES ${placeholders}
                ON DUPLICATE KEY UPDATE
                    guest_name = VALUES(guest_name),
                    email = VALUES(email),
                    relationshipWithGroom = VALUES(relationshipWithGroom),
                    relationshipWithBride = VALUES(relationshipWithBride),
                    relationshipWithCouple = VALUES(relationshipWithCouple),
                    guestDescription = VALUES(guestDescription),
                    sharedMemories = VALUES(sharedMemories),
                    message = VALUES(message);
            `;
            console.log(`[SYNC] 準備執行批量 UPSERT，共 ${guestsToUpsert.length} 筆資料`);

            const [result] = await pool.query(upsertQuery, queryValues);
            // affectedRows = (插入的行數) + (更新的行數)
            // changedRows = (實際發生資料變更的行數)
            insertedCount = result.affectedRows - result.changedRows;
            updatedCount = result.changedRows;

            console.log(`[SYNC] 批量 UPSERT 完成：插入 ${insertedCount} 筆，更新 ${updatedCount} 筆。`);
        } else {
            console.log(`[SYNC] Google Sheet 中沒有有效賓客資料可供同步。`);
        }

        // 8. 返回同步結果摘要
        const totalFailed = failedRowParsing.length;
        console.log(`[SYNC] 同步流程完成。總計：插入 ${insertedCount} 筆，更新 ${updatedCount} 筆，解析失敗 ${totalFailed} 筆。`);
        res.status(200).json({
            message: `資料同步完成。插入 ${insertedCount} 筆，更新 ${updatedCount} 筆，解析失敗 ${totalFailed} 筆。`,
            insertedCount: insertedCount,
            updatedCount: updatedCount,
            failedRowParsing: failedRowParsing.map(f => ({ ...f, rowData: undefined })) // 不回傳原始行資料
        });

    } catch (error) {
        // 捕獲所有未預期的錯誤，包括 Google API 和資料庫操作錯誤
        console.error("[SYNC] 同步 Google Sheets 資料時發生未預期的錯誤:", error);
        res.status(500).json({
            message: "伺服器內部錯誤",
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            details: error.stack // 僅在開發環境或需要時提供 stack trace
        });
    }
});

module.exports = router;