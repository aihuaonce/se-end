// backend/routes/syncRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池
const { google } = require('googleapis'); // <-- 確保這行存在
const validator = require('validator');

// Google Sheets API 認證設定 (這些變數定義在模組頂部是正確的)
const keyFile = process.env.GOOGLE_SHEETS_KEY_FILE; // 確保這個環境變數指向您的金鑰檔案路徑
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

router.post("/:id", async (req, res) => {
    console.log(`[SYNC] 開始同步客戶 ID ${req.params.id} 的資料`);
    try {
        const { id } = req.params;
        // 簡單驗證 id 是否為數字
        if (!validator.isInt(id)) {
            console.warn(`[SYNC] 客戶 ID ${id} 無效`);
            return res.status(400).json({ message: "無效的客戶 ID" });
        }
        const customerId = parseInt(id);

        // --- 確保這裡有 Google Sheets API 的認證和初始化邏輯 ---
        if (!keyFile) {
            console.error("[SYNC] 缺少 Google Sheets 金鑰檔案路徑 (GOOGLE_SHEETS_KEY_FILE)");
            return res.status(500).json({ message: "伺服器配置錯誤：缺少 Google Sheets 金鑰檔案" });
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: keyFile,
            scopes: scopes,
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client }); // <-- 這裡定義了 'sheets' 變數！
        // --- Google Sheets API 初始化結束 ---


        pool.query("SELECT google_sheet_link FROM customers WHERE id = ?", [customerId], async (err, results) => {
            if (err) {
                console.error(`[SYNC] 查詢客戶 ${customerId} 的 Google Sheet 連結錯誤:`, err);
                return res.status(500).json({ message: "伺服器錯誤，無法獲取客戶資訊" });
            }

            if (results.length === 0 || !results[0].google_sheet_link) {
                console.warn(`[SYNC] 找不到客戶 ${customerId} 或其 Google Sheet 連結`);
                return res.status(404).json({ message: "該客戶尚無 Google Sheet 連結" });
            }

            const googleSheetLink = results[0].google_sheet_link;
            let sheetId;
            try {
                const match = googleSheetLink.match(/spreadsheets\/d\/(.*?)\//);
                if (!match || match.length < 2 || !match[1]) {
                    console.warn(`[SYNC] 客戶 ${customerId} 的 Google Sheet 連結格式無效:`, googleSheetLink);
                    return res.status(400).json({ message: "無效的 Google Sheet 連結格式" });
                }
                sheetId = match[1];
                console.log(`[SYNC] 客戶 ${customerId} 的 Google Sheet ID: ${sheetId}`);
            } catch (parseError) {
                console.error(`[SYNC] 解析 Google Sheet 連結 ${googleSheetLink} 錯誤:`, parseError);
                return res.status(400).json({ message: "解析 Google Sheet 連結時發生錯誤" });
            }

            let sheetDataValues = [];
            // 將 range 也定義在這裡，以便在 catch 中使用
            const range = "工作表1!A2:I"; // 定義範圍

            try {
                console.log(`[SYNC] 從 Google Sheet ${sheetId} 讀取範圍 ${range}`);
                // 現在 'sheets' 已經被定義了
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: range,
                });
                sheetDataValues = response.data.values || [];
                console.log(`[SYNC] 從 Google Sheet 讀取到 ${sheetDataValues.length} 行資料`);

            } catch (googleSheetError) {
                // 這裡可以使用 sheetId 和 range 變數了
                console.error(`[SYNC] 從 Google Sheet 讀取資料失敗 (Sheet ID: ${sheetId}, Range: ${range}):`, googleSheetError.message);
                return res.status(500).json({ message: `從 Google Sheet 讀取資料失敗: ${googleSheetError.message}` });
            }

            if (sheetDataValues.length > 0) {
                const inserted = [];
                const updatedAttempts = [];
                const updatedUniqueIds = new Set();
                const failedOperations = [];

                for (let i = 0; i < sheetDataValues.length; i++) {
                    const row = sheetDataValues[i];
                    console.log(`[SYNC] 處理 Google Sheet 第 ${i + 2} 行:`, row);

                    if (row.length < 9) {
                        console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行：欄位不足 (${row.length} < 9)`, row);
                        failedOperations.push({ rowIndex: i + 2, rowData: row, reason: "欄位不足" });
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

                    if (!googleSheetGuestId) {
                        console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行：賓客 ID 為空`, row);
                        failedOperations.push({ rowIndex: i + 2, rowData: row, reason: "賓客 ID 為空" });
                        continue;
                    }
                    if (!email) {
                        console.warn(`[SYNC] 跳過 Google Sheet 第 ${i + 2} 行 (賓客 ID: ${googleSheetGuestId})：Email 為空`, row);
                        failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'process', reason: "Email 為空，無法處理" });
                        continue;
                    }

                    console.log(`[SYNC] 處理賓客 ID: ${googleSheetGuestId}, 姓名: ${guestName}, Email: ${email}`);

                    await new Promise((resolve) => {
                        const selectQuery = `SELECT id, guest_name, email, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message
                                             FROM guests
                                             WHERE google_sheet_guest_id = ? AND customer_id = ?`;

                        pool.query(
                            selectQuery,
                            [googleSheetGuestId, customerId],
                            (err, existingResults) => {
                                console.log(`[SYNC] 查詢資料庫 (ID: ${googleSheetGuestId}, Customer ID: ${customerId}) 結果:`, existingResults);

                                if (err) {
                                    console.error(`[SYNC] 查詢現有賓客失敗 (ID: ${googleSheetGuestId}, Customer ID: ${customerId}):`, err);
                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'query_existing', reason: `查詢資料庫失敗: ${err.message}` });
                                    return resolve();
                                }

                                if (existingResults.length === 0) {
                                    console.log(`[SYNC] 賓客 (ID: ${googleSheetGuestId}) 不存在，執行插入`);
                                    pool.query(
                                        "INSERT INTO guests (google_sheet_guest_id, guest_name, email, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message, is_sent, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                        [
                                            googleSheetGuestId,
                                            guestName,
                                            email,
                                            relationshipWithGroom,
                                            relationshipWithBride,
                                            relationshipWithCouple,
                                            guestDescription,
                                            sharedMemories,
                                            message,
                                            0,
                                            customerId
                                        ],
                                        (err, insertResults) => {
                                            if (err) {
                                                console.error(`[SYNC] 插入賓客資料失敗 (ID: ${googleSheetGuestId}):`, err);
                                                if (err.code === 'ER_DUP_ENTRY') {
                                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'insert', reason: "資料已存在 (重複)" });
                                                } else {
                                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'insert', reason: `插入資料庫失敗: ${err.message}` });
                                                }
                                            } else {
                                                console.log(`[SYNC] 成功插入賓客 (ID: ${googleSheetGuestId}, DB ID: ${insertResults.insertId})`);
                                                inserted.push({
                                                    id: insertResults.insertId,
                                                    google_sheet_guest_id: googleSheetGuestId,
                                                    guest_name: guestName,
                                                    email: email,
                                                    is_sent: 0,
                                                    relationshipWithGroom,
                                                    relationshipWithBride,
                                                    relationshipWithCouple,
                                                    guestDescription,
                                                    sharedMemories,
                                                    message
                                                });
                                            }
                                            resolve();
                                        }
                                    );
                                } else if (existingResults.length === 1) {
                                    const existingGuest = existingResults[0];
                                    const existingGuestId = existingGuest.id;

                                    console.log(`[SYNC] 賓客 (ID: ${googleSheetGuestId}, DB ID: ${existingGuestId}) 已存在，比較資料差異`);

                                    const isDataDifferent =
                                        (guestName !== (existingGuest.guest_name || '').trim()) ||
                                        (email !== (existingGuest.email || '').trim()) ||
                                        (relationshipWithGroom !== (existingGuest.relationshipWithGroom || '').trim()) ||
                                        (relationshipWithBride !== (existingGuest.relationshipWithBride || '').trim()) ||
                                        (relationshipWithCouple !== (existingGuest.relationshipWithCouple || '').trim()) ||
                                        (guestDescription !== (existingGuest.guestDescription || '').trim()) ||
                                        (sharedMemories !== (existingGuest.sharedMemories || '').trim()) ||
                                        (message !== (existingGuest.message || '').trim());

                                    if (isDataDifferent) {
                                        console.log(`[SYNC] 資料存在差異，執行更新 (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                        pool.query(
                                            `UPDATE guests SET
                                            guest_name = ?,
                                            email = ?,
                                            relationshipWithGroom = ?,
                                            relationshipWithBride = ?,
                                            relationshipWithCouple = ?,
                                            guestDescription = ?,
                                            sharedMemories = ?,
                                            message = ?
                                            WHERE id = ?`,
                                            [
                                                guestName,
                                                email,
                                                relationshipWithGroom,
                                                relationshipWithBride,
                                                relationshipWithCouple,
                                                guestDescription,
                                                sharedMemories,
                                                message,
                                                existingGuestId
                                            ],
                                            (err, updateResults) => {
                                                if (err) {
                                                    console.error(`[SYNC] 更新賓客資料失敗 (ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId}):`, err);
                                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'update', reason: `更新資料庫失敗: ${err.message}` });
                                                } else {
                                                    if (updateResults.affectedRows > 0) {
                                                        console.log(`[SYNC] 成功更新賓客資料 (affectedRows: ${updateResults.affectedRows}) (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                                        updatedAttempts.push({
                                                            id: existingGuestId,
                                                            google_sheet_guest_id: googleSheetGuestId,
                                                            guest_name: guestName,
                                                            email: email,
                                                            relationshipWithGroom,
                                                            relationshipWithBride,
                                                            relationshipWithCouple,
                                                            guestDescription,
                                                            sharedMemories,
                                                            message
                                                        });
                                                        updatedUniqueIds.add(existingGuestId);
                                                        console.log(`[SYNC] 目前 unique updated 數量: ${updatedUniqueIds.size}`);
                                                    } else {
                                                        console.log(`[SYNC] 賓客資料與 Google Sheet 相同，跳過實際更新 (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                                    }
                                                }
                                                resolve();
                                            }
                                        );
                                    } else {
                                        console.log(`[SYNC] 賓客資料與 Google Sheet 相同，跳過更新 (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                        resolve();
                                    }

                                } else {
                                    console.error(`[SYNC] 錯誤：在客戶 ${customerId} 下，Google Sheet 賓客 ID '${googleSheetGuestId}' 在資料庫中出現多筆`, existingResults);
                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'query_conflict', reason: `資料庫中存在多筆相同的 Google Sheet 賓客 ID` });
                                    resolve();
                                }
                            }
                        );
                    });
                }
                // 回傳同步結果摘要
                console.log(`[SYNC] 同步完成。插入 ${inserted.length} 筆，唯一更新 ${updatedUniqueIds.size} 筆，失敗 ${failedOperations.length} 筆`);
                return res.status(200).json({
                    message: `同步完成：插入 ${inserted.length} 筆，更新 ${updatedUniqueIds.size} 筆，失敗 ${failedOperations.length} 筆`,
                    insertedCount: inserted.length,
                    updatedCount: updatedUniqueIds.size,
                    failedOperations: failedOperations.map(f => ({ ...f, rowData: undefined })),
                });

            } else {
                console.log(`[SYNC] Google Sheet 中沒有可同步的資料 (從 A2:I)`);
                res.status(404).json({ message: "Google Sheet 中沒有可同步的資料 (從 A2:I)" });
            }
        });
    } catch (error) {
        console.error("[SYNC] 同步 Google Sheets 資料時發生未預期的錯誤:", error);
        res.status(500).json({ message: "伺服器內部錯誤" });
    }
});

module.exports = router;