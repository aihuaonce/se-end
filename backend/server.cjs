const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const { google } = require("googleapis");
const validator = require("validator");
const moment = require('moment');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// MySQL 連接設定
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 測試資料庫連接
pool.getConnection((err, connection) => {
    if (err) {
        console.error("資料庫連接失敗:", err);
        // 您可以選擇在這裡終止應用程式或採取其他錯誤處理措施
    } else {
        console.log("成功連接到資料庫");
        connection.release(); // 釋放連接
    }
});


// Google Sheets API 認證設定
// 建議將 keyFile 路徑或內容儲存在環境變數中以提高安全性
const keyFile = process.env.GOOGLE_SHEETS_KEY_FILE;
const scopes = ["https://www.googleapis.com/auth/spreadsheets"]; // 將權限範圍改為讀寫，以便將來可能的需求

let authClient;
let sheets;

// 驗證 Google Sheets API 認證並初始化 sheets 客戶端
const initializeGoogleSheets = async () => {
    try {
        authClient = await new google.auth.GoogleAuth({
            keyFile: keyFile,
            scopes: scopes,
        }).getClient();
        sheets = google.sheets({ version: "v4", auth: authClient });
        console.log("Google Sheets API 客戶端初始化成功");
    } catch (err) {
        console.error("Google Sheets API 認證失敗:", err);
        // 您可以選擇在這裡處理初始化失敗的情況
    }
};

initializeGoogleSheets(); // 啟動時初始化 Google Sheets 客戶端


// 查詢所有客戶資料
app.get("/guests", (req, res) => {
    pool.query("SELECT * FROM customers", (err, results) => {
        if (err) {
            console.error("抓取客戶資料錯誤:", err);
            return res.status(500).json({ message: "伺服器錯誤，無法獲取客戶資料" });
        }
        res.json(results);
    });
});

// 新增客戶資料
app.post("/customers", (req, res) => {
    const {
        groom_name,
        bride_name,
        email,
        phone,
        wedding_date: weddingDatetimeLocalString, // 將接收到的 datetime-local 字串重新命名
        wedding_location, // 新增接收地點欄位
        form_link
    } = req.body;

    // 後端基本輸入驗證 (地點可選填，所以不列入必填檢查)
    if (!groom_name || !bride_name || !email || !phone || !weddingDatetimeLocalString || !form_link) {
        return res.status(400).json({ message: "新郎姓名、新娘姓名、電子郵件、聯絡電話、婚禮日期和 Google Sheet 連結是必填項" });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "請輸入有效的電子郵件地址" });
    }

    // 簡單的 URL 格式驗證
    if (!validator.isURL(form_link, { require_protocol: true })) {
        return res.status(400).json({ message: "請輸入有效的 Google 試算表連結 (包含 http:// 或 https://)" });
    }


    // 您可以針對 phone 加入更多驗證，例如格式或長度
    // 您也可以針對 wedding_location 加入驗證，例如長度


    let wedding_date = null;
    let wedding_time = null;

    // 使用 Date 物件更穩健地解析 datetime-local 字串
    if (weddingDatetimeLocalString) {
        try {
            const dateObj = new Date(weddingDatetimeLocalString);
            // 檢查日期解析是否成功且不是無效日期
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = ('0' + (dateObj.getMonth() + 1)).slice(-2); // Months are 0-indexed
                const day = ('0' + dateObj.getDate()).slice(-2);
                wedding_date = `${year}-${month}-${day}`; //--MM-DD 格式

                const hours = ('0' + dateObj.getHours()).slice(-2);
                const minutes = ('0' + dateObj.getMinutes()).slice(-2);
                const seconds = ('0' + dateObj.getSeconds()).slice(-2);
                wedding_time = `${hours}:${minutes}:${seconds}`; // HH:MM:SS 格式 (MySQL TIME)

            } else {
                console.warn("無法解析婚禮日期時間字串為有效日期:", weddingDatetimeLocalString);
                // 如果解析失敗，保持 date 和 time 為 null
                wedding_date = null;
                wedding_time = null;
            }
        } catch (parseError) {
            console.error("解析婚禮日期時間時發生錯誤:", parseError);
            // 如果解析過程中拋出錯誤，保持 date 和 time 為 null
            wedding_date = null;
            wedding_time = null;
        }
    }


    // 修改 INSERT 語句，包含 wedding_time 和 wedding_location 欄位
    const query = `
        INSERT INTO customers (groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, google_sheet_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 修改傳入 pool.query 的值陣列，包含分割後的日期和時間以及地點
    pool.query(query, [groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, form_link], (err, results) => {
        if (err) {
            console.error("新增客戶到資料庫錯誤：", err); // 更詳細的錯誤日誌
            // 檢查是否是重複的電子郵件或連結等唯一約束錯誤
            if (err.code === 'ER_DUP_ENTRY') {
                if (err.sqlMessage.includes('email')) {
                    return res.status(409).json({ message: "此電子郵件已被使用" });
                }
                if (err.sqlMessage.includes('google_sheet_link')) {
                    return res.status(409).json({ message: "此 Google Sheet 連結已被使用" });
                }
                return res.status(409).json({ message: "客戶資料已存在 (重複的電子郵件或 Google Sheet 連結)" });

            }
            // 檢查是否是日期、時間或地點格式錯誤
            if (err.code && err.code.startsWith('ER_')) { // 例如 ER_BAD_FIELD_VALUE, ER_TRUNCATED_WRONG_VALUE 等
                // 記錄完整的錯誤訊息，包括 SQL 和參數
                console.error("新增客戶 SQL 錯誤詳情:", {
                    code: err.code,
                    sqlMessage: err.sqlMessage,
                    sql: err.sql,
                    values: [groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, form_link]
                });
                return res.status(400).json({ message: `資料格式錯誤：請檢查日期、時間或地點格式是否正確 (${err.sqlMessage})` });
            }


            return res.status(500).json({ message: "新增失敗，請稍後再試" });
        }
        // 返回新增的客戶資料，前端可以直接更新列表
        // 注意：這裡返回的 newCustomer 物件欄位名稱需要與前端 App.js 中 customers 狀態的欄位名稱一致
        const newCustomer = {
            id: results.insertId,
            groom_name,
            bride_name,
            email,
            phone,
            wedding_date: wedding_date, // 返回分割後的日期
            wedding_time: wedding_time, // 返回分割後的時間
            wedding_location: wedding_location, // 返回地點
            google_sheet_link: form_link
        };
        res.status(201).json({ message: "新增成功", customer: newCustomer });
    });
});

// ==== PUT /customers/:id 端點 (更新客戶資料) - 修正 ERR_HTTP_HEADERS_SENT ====
app.put("/customers/:id", (req, res) => {
    const customerId = req.params.id;
    const {
        groom_name,
        bride_name,
        email,
        phone,
        wedding_date: weddingDatetimeLocalString, // 接收 datetime-local 字串
        wedding_location,
        form_link
    } = req.body;

    // 後端基本輸入驗證 (地點可選填，所以不列入必填檢查)
    if (!groom_name || !bride_name || !email || !phone || !weddingDatetimeLocalString || !form_link) {
        return res.status(400).json({ message: "新郎姓名、新娘姓名、電子郵件、聯絡電話、婚禮日期和 Google Sheet 連結是必填項" });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "請輸入有效的電子郵件地址" });
    }

    if (!validator.isURL(form_link, { require_protocol: true })) {
        return res.status(400).json({ message: "請輸入有效的 Google 試算表連結 (包含 http:// 或 https://)" });
    }

    // 您可以針對 phone 和 wedding_location 加入更多驗證


    let wedding_date = null;
    let wedding_time = null;

    // 使用 Date 物件更穩健地解析 datetime-local 字串
    if (weddingDatetimeLocalString) {
        try {
            const dateObj = new Date(weddingDatetimeLocalString);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = ('0' + (dateObj.getMonth() + 1)).slice(-2); // Months are 0-indexed
                const day = ('0' + dateObj.getDate()).slice(-2);
                wedding_date = `${year}-${month}-${day}`; //--MM-DD 格式

                const hours = ('0' + dateObj.getHours()).slice(-2);
                const minutes = ('0' + dateObj.getMinutes()).slice(-2);
                const seconds = ('0' + dateObj.getSeconds()).slice(-2);
                wedding_time = `${hours}:${minutes}:${seconds}`; // HH:MM:SS 格式 (MySQL TIME)

            } else {
                console.warn(`PUT /customers/${customerId}: 無法解析婚禮日期時間字串為有效日期:`, weddingDatetimeLocalString);
                wedding_date = null;
                wedding_time = null;
            }
        } catch (parseError) {
            console.error(`PUT /customers/${customerId}: 解析婚禮日期時間時發生錯誤:`, parseError);
            wedding_date = null;
            wedding_time = null;
        }
    }


    const query = `
        UPDATE customers
        SET groom_name = ?, bride_name = ?, email = ?, phone = ?, wedding_date = ?, wedding_time = ?, wedding_location = ?, google_sheet_link = ?
        WHERE id = ?
    `;

    pool.query(
        query,
        [groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, form_link, customerId],
        (err, results) => {
            if (err) {
                console.error(`更新客戶 ${customerId} 資料到資料庫錯誤：`, err);
                // 檢查是否是重複的電子郵件或連結等唯一約束錯誤
                if (err.code === 'ER_DUP_ENTRY') {
                    if (err.sqlMessage.includes('email')) {
                        return res.status(409).json({ message: "此電子郵件已被使用" });
                    }
                    if (err.sqlMessage.includes('google_sheet_link')) {
                        return res.status(409).json({ message: "此 Google Sheet 連結已被使用" });
                    }
                    return res.status(409).json({ message: "客戶資料已存在 (重複的電子郵件或 Google Sheet 連結)" });
                }
                // 檢查是否是日期、時間或地點格式錯誤
                if (err.code && err.code.startsWith('ER_')) {
                    console.error(`PUT /customers/${customerId} SQL 錯誤詳情:`, {
                        code: err.code,
                        sqlMessage: err.sqlMessage,
                        sql: err.sql,
                        values: [groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, form_link, customerId]
                    });
                    return res.status(400).json({ message: `資料格式錯誤：請檢查日期、時間或地點格式是否正確 (${err.sqlMessage})` });
                }

                return res.status(500).json({ message: "更新失敗，請稍後再試" });
            }

            if (results.affectedRows === 0) {
                // 如果 affectedRows 是 0，表示找不到該 ID 的客戶
                return res.status(404).json({ message: `找不到 ID 為 ${customerId} 的客戶資料` });
            }

            // 返回成功訊息或更新後的客戶資料 (可選)
            return res.status(200).json({ message: "更新成功" });
            // 或者可以返回更新後的客戶資料供前端更新 state
            /*
            const updatedCustomer = {
                 id: parseInt(customerId),
                 groom_name,
                 bride_name,
                 email,
                 phone,
                 wedding_date, // 後端返回的日期
                 wedding_time, // 後端返回的時間
                 wedding_location,
                 google_sheet_link: form_link
            };
            return res.status(200).json({ message: "更新成功", customer: updatedCustomer });
            */
        }
    );
});

// **** 新增 API：更新客戶狀態 (使用回呼函式) ****
app.put("/customers/:id/status", (req, res) => { // <--- 移除 async 關鍵字
    console.log('Received PUT /customers/:id/status request', req.params.id);
    const customerId = req.params.id;
    const { status } = req.body;

    // 驗證 status 是否為 'open' 或 'closed'
    if (!status || (status !== 'open' && status !== 'closed')) {
        return res.status(400).json({ message: "無效的狀態值，必須是 'open' 或 'closed'" });
    }

    // 驗證 ID 是否為數字
    if (!validator.isInt(String(customerId))) {
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    const query = "UPDATE customers SET status = ? WHERE id = ?";
    pool.query(query, [status, customerId], (err, results) => { // <--- 改為回呼函式
        if (err) {
            console.error(`更新客戶 ${customerId} 狀態錯誤:`, err);
            return res.status(500).json({ message: "更新狀態失敗，請稍後再試" });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: `找不到 ID 為 ${customerId} 的客戶資料` });
        }

        console.log(`客戶 ${customerId} 狀態已更新為 ${status}`);
        res.status(200).json({ message: "客戶狀態更新成功", customerId: customerId, status: status });
    }); // <--- 結束 pool.query 呼叫
});

// ==== 新增 DELETE /customers/:id 端點 (刪除客戶資料) ====
app.delete("/customers/:id", (req, res) => {
    const customerId = req.params.id;

    // 簡單驗證 id 是否為數字
    if (!validator.isInt(customerId)) {
        console.warn(`DELETE /customers/${customerId}: 無效的客戶 ID`);
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    // 注意：這裡只刪除 customers 表格中的記錄。
    // 如果 guests 表格中有外鍵約束並設置 ON DELETE CASCADE，則相關的賓客記錄會自動刪除。
    // 否則，您需要在刪除客戶之前手動刪除該客戶下的所有賓客記錄，以避免孤立數據。
    // 例如： pool.query("DELETE FROM guests WHERE customer_id = ?", [customerId], (err, results) => { ... });
    // 為了簡單起見，這裡只實現刪除 customers 表格的記錄，請根據您的資料庫設計調整。

    const query = "DELETE FROM customers WHERE id = ?";

    pool.query(query, [customerId], (err, results) => {
        if (err) {
            console.error(`刪除客戶 ${customerId} 資料庫錯誤：`, err);
            // 檢查是否是因為外鍵約束導致無法刪除 (如果沒有設置 ON DELETE CASCADE)
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ message: "無法刪除客戶，因為該客戶下仍有賓客資料。請先刪除所有相關賓客資料。" });
            }
            return res.status(500).json({ message: "刪除失敗，請稍後再試" });
        }

        if (results.affectedRows === 0) {
            // 如果 affectedRows 是 0，表示找不到該 ID 的客戶
            return res.status(404).json({ message: `找不到 ID 為 ${customerId} 的客戶資料` });
        }

        // 返回成功訊息
        console.log(`成功刪除客戶 ID: ${customerId}`);
        return res.status(200).json({ message: "刪除成功" });
    });
});


// 查詢單個客戶的資料
// 假設客戶資料表中包含 wedding_time 和 wedding_location 欄位
app.get("/customers/:id", (req, res) => {
    const { id } = req.params;
    // 簡單驗證 id 是否為數字
    if (!validator.isInt(id)) {
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    pool.query("SELECT id, groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, google_sheet_link FROM customers WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error("抓取單個客戶資料錯誤:", err);
            return res.status(500).json({ message: "伺服器錯誤，無法獲取客戶資料" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "找不到客戶資料" });
        }
        res.json(results[0]);
    });
});

// 查詢單個客戶的賓客資料
app.get("/customers/:id/sheet-data", (req, res) => {
    const { id } = req.params;
    // 簡單驗證 id 是否為數字
    if (!validator.isInt(id)) {
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    // 注意這裡查詢了 google_sheet_guest_id 欄位
    pool.query(
        "SELECT id, google_sheet_guest_id, guest_name, email, is_sent, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message FROM guests WHERE customer_id = ?",
        [id],
        (err, results) => {
            if (err) {
                console.error("抓取賓客資料錯誤:", err); // 記錄伺服器端的錯誤以便除錯
                return res.status(500).json({ message: "伺服器錯誤，無法獲取賓客資料" });
            }

            // 成功獲取資料，返回賓客資料陣列 (即使為空陣列)
            res.json(results);
        }
    );
});

// 從 Google Sheet 同步賓客資料到資料庫 (使用 Google Sheet 賓客 ID 進行同步，只在資料不同時才更新，加強日誌)
app.post("/sync-sheet-data/:id", async (req, res) => {
    console.log(`[SYNC] 開始同步客戶 ID ${req.params.id} 的資料`);
    try {
        const { id } = req.params;
        // 簡單驗證 id 是否為數字
        if (!validator.isInt(id)) {
            console.warn(`[SYNC] 客戶 ID ${id} 無效`);
            return res.status(400).json({ message: "無效的客戶 ID" });
        }
        const customerId = parseInt(id);


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

            // 檢查 sheets 客戶端是否已初始化
            if (!sheets) {
                console.error("[SYNC] Google Sheets API 客戶端未初始化");
                return res.status(500).json({ message: "伺服器內部錯誤，Google Sheets API 無法使用" });
            }


            let sheetDataValues = [];
            try {
                // 讀取 Google Sheets 中各個欄位的資料 (假設從第二行開始是資料)
                // 讀取 A 到 I 列，A 列是唯一的賓客 ID
                const range = "工作表1!A2:I";
                console.log(`[SYNC] 從 Google Sheet ${sheetId} 讀取範圍 ${range}`);
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: range,
                });
                sheetDataValues = response.data.values || [];
                console.log(`[SYNC] 從 Google Sheet 讀取到 ${sheetDataValues.length} 行資料`);

            } catch (googleSheetError) {
                console.error(`[SYNC] 從 Google Sheet 讀取資料失敗 (Sheet ID: ${sheetId}, Range: ${range}):`, googleSheetError.message);
                // 更詳細的錯誤訊息，幫助前端理解問題
                return res.status(500).json({ message: `從 Google Sheet 讀取資料失敗: ${googleSheetError.message}` });
            }


            if (sheetDataValues.length > 0) {
                const inserted = [];
                const updatedAttempts = []; // 儲存每次成功的更新嘗試 (包括重複 ID 觸發的，但這裡會檢查是否有實際資料變更)
                const updatedUniqueIds = new Set(); // 新增 Set 來追蹤唯一的資料庫 ID
                const failedOperations = [];
                // const customerId = parseInt(id); // 已在上面解析


                for (let i = 0; i < sheetDataValues.length; i++) {
                    const row = sheetDataValues[i];
                    console.log(`[SYNC] 處理 Google Sheet 第 ${i + 2} 行:`, row); // 記錄正在處理的行號 (從 2 開始)

                    // 確保每一行都有足夠的欄位
                    // 根據您提供的格式，從賓客編號到電子郵件地址共有 9 列 (A 到 I)
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

                    // 如果賓客 ID 或 Email 為空，則跳過此行 (ID 是唯一的識別鍵，Email 是必要欄位)
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
                        // **查詢資料庫獲取現有記錄的所有相關欄位**
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
                                    return resolve(); // 繼續處理下一筆資料
                                }

                                if (existingResults.length === 0) {
                                    // 資料不存在 (根據 google_sheet_guest_id 和 customer_id 判斷)，執行 INSERT
                                    console.log(`[SYNC] 賓客 (ID: ${googleSheetGuestId}) 不存在，執行插入`);
                                    pool.query(
                                        "INSERT INTO guests (google_sheet_guest_id, guest_name, email, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message, is_sent, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                        [
                                            googleSheetGuestId, // 插入 Google Sheet 賓客 ID
                                            guestName,
                                            email,
                                            relationshipWithGroom,
                                            relationshipWithBride,
                                            relationshipWithCouple,
                                            guestDescription,
                                            sharedMemories,
                                            message,
                                            0, // 新增時預設 is_sent 為 0
                                            customerId
                                        ],
                                        (err, insertResults) => {
                                            if (err) {
                                                console.error(`[SYNC] 插入賓客資料失敗 (ID: ${googleSheetGuestId}):`, err);
                                                // 檢查是否是唯一約束錯誤 (理論上不應該發生如果資料庫結構修改正確)
                                                if (err.code === 'ER_DUP_ENTRY') {
                                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'insert', reason: "資料已存在 (重複)" });
                                                } else {
                                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'insert', reason: `插入資料庫失敗: ${err.message}` });
                                                }
                                            } else {
                                                // 成功插入
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
                                            resolve(); // 繼續處理下一筆資料
                                        }
                                    );
                                } else if (existingResults.length === 1) {
                                    // 資料已存在且只有一筆匹配，獲取現有資料
                                    const existingGuest = existingResults[0];
                                    const existingGuestId = existingGuest.id;

                                    console.log(`[SYNC] 賓客 (ID: ${googleSheetGuestId}, DB ID: ${existingGuestId}) 已存在，比較資料差異`);

                                    // **比較 Google Sheet 資料與資料庫現有資料**
                                    // 注意：這裡比較時要處理 null 和 undefined，並移除字串首尾空白
                                    const isDataDifferent =
                                        (guestName !== (existingGuest.guest_name || '').trim()) ||
                                        (email !== (existingGuest.email || '').trim()) || // Email 也可能更新
                                        (relationshipWithGroom !== (existingGuest.relationshipWithGroom || '').trim()) ||
                                        (relationshipWithBride !== (existingGuest.relationshipWithBride || '').trim()) ||
                                        (relationshipWithCouple !== (existingGuest.relationshipWithCouple || '').trim()) ||
                                        (guestDescription !== (existingGuest.guestDescription || '').trim()) ||
                                        (sharedMemories !== (existingGuest.sharedMemories || '').trim()) ||
                                        (message !== (existingGuest.message || '').trim());
                                    // is_sent 狀態通常不由 Google Sheet 控制，所以不包含在這裡比較

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
                                            WHERE id = ?`, // 使用資料庫的自增長 ID 進行更新
                                            [
                                                guestName, // 使用 Google Sheet 中的新姓名
                                                email, // 使用 Google Sheet 中的新 Email
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
                                                    // 檢查是否有實際的行被影響 (affectedRows > 0 表示資料真的有變更)
                                                    if (updateResults.affectedRows > 0) {
                                                        console.log(`[SYNC] 成功更新賓客資料 (affectedRows: ${updateResults.affectedRows}) (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                                        // 將成功的更新嘗試記錄到 updatedAttempts 陣列
                                                        updatedAttempts.push({
                                                            id: existingGuestId, // 記錄資料庫 ID
                                                            google_sheet_guest_id: googleSheetGuestId,
                                                            guest_name: guestName,
                                                            email: email,
                                                            // is_sent 狀態不應在這裡被 Google Sheet 的資料覆蓋
                                                            relationshipWithGroom,
                                                            relationshipWithBride,
                                                            relationshipWithCouple,
                                                            guestDescription,
                                                            sharedMemories,
                                                            message
                                                        });
                                                        // 將資料庫 ID 加入 Set (確保唯一)
                                                        updatedUniqueIds.add(existingGuestId);
                                                        console.log(`[SYNC] 目前 unique updated 數量: ${updatedUniqueIds.size}`);
                                                    } else {
                                                        console.log(`[SYNC] 賓客資料與 Google Sheet 相同，跳過實際更新 (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                                    }
                                                }
                                                resolve(); // 繼續處理下一筆資料
                                            }
                                        );
                                    } else {
                                        console.log(`[SYNC] 賓客資料與 Google Sheet 相同，跳過更新 (DB ID: ${existingGuestId}, Google Sheet ID: ${googleSheetGuestId})`);
                                        resolve(); // 資料相同，跳過更新
                                    }

                                } else {
                                    // 找到多筆匹配 (同一個客戶下，相同的 Google Sheet 賓客 ID 在資料庫中出現多次，這不應該發生如果唯一約束設定正確)
                                    console.error(`[SYNC] 錯誤：在客戶 ${customerId} 下，Google Sheet 賓客 ID '${googleSheetGuestId}' 在資料庫中出現多筆`, existingResults);
                                    failedOperations.push({ rowIndex: i + 2, googleSheetGuestId, guestName, operation: 'query_conflict', reason: `資料庫中存在多筆相同的 Google Sheet 賓客 ID` });
                                    resolve(); // 繼續處理下一筆資料
                                }
                            }
                        );
                    });
                }
                // 回傳同步結果摘要 - 使用 updatedUniqueIds.size 計算更新筆數
                console.log(`[SYNC] 同步完成。插入 ${inserted.length} 筆，唯一更新 ${updatedUniqueIds.size} 筆，失敗 ${failedOperations.length} 筆`);
                return res.status(200).json({
                    message: `同步完成：插入 ${inserted.length} 筆，更新 ${updatedUniqueIds.size} 筆，失敗 ${failedOperations.length} 筆`,
                    insertedCount: inserted.length,
                    updatedCount: updatedUniqueIds.size, // 使用 Set 的大小
                    failedOperations: failedOperations.map(f => ({ ...f, rowData: undefined })), // 不回傳原始行資料
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

// 更新賓客的寄送狀態
app.post('/update-status', (req, res) => {
    const { guest_id, status } = req.body;

    // 簡單驗證輸入
    if (guest_id === undefined || status === undefined) {
        return res.status(400).json({ message: "缺少 guest_id 或 status 參數" });
    }
    // 驗證 guest_id 是否為數字，status 是否為 0 或 1
    if (!validator.isInt(String(guest_id)) || !validator.isIn(String(status), ['0', '1'])) {
        return res.status(400).json({ message: "無效的 guest_id 或 status 值" });
    }


    // 更新資料庫中的資料
    const query = 'UPDATE guests SET is_sent = ? WHERE id = ?';

    pool.query(query, [status, guest_id], (err, results) => {
        if (err) {
            console.error('更新資料庫狀態錯誤:', err);
            return res.status(500).json({ message: '更新資料庫狀態失敗' });
        }
        // 檢查是否有資料被更新
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: `找不到 ID 為 ${guest_id} 的賓客資料` });
        }
        return res.status(200).json({ message: '資料庫狀態更新成功' });
    });
});

const port = process.env.PORT || 5713;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});