// backend/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保這個 pool 是 Promise-based 的 (mysql2/promise)
const validator = require('validator');
const moment = require('moment'); // 用於日期時間格式化

// --- 輔助函數 ---
// 統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    res.status(500).json({
        message: `${message}: ${error.message}`, // 提供更具體的錯誤信息
        code: error.code || 'UNKNOWN_DB_ERROR'
    });
};

// --- 路由定義 ---

// 獲取所有婚禮情侶 (客戶)
router.get('/', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT * FROM wedding_couples');
        res.json(results);
    } catch (err) {
        sendDbError(res, 'GET /', err, "無法獲取所有客戶資料");
    }
});

// 新增婚禮情侶 (客戶)
router.post('/', async (req, res) => {
    // 從請求體中解構數據
    const { groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, google_sheet_link } = req.body;

    // 1. 驗證輸入
    if (!groom_name || !bride_name || !email || !phone || !google_sheet_link) {
        console.warn("[POST /] 缺少必要欄位");
        return res.status(400).json({ message: "缺少必要欄位：新郎姓名、新娘姓名、Email、電話號碼 或 Google 表單連結" });
    }
    if (!validator.isEmail(email)) {
        console.warn(`[POST /] Email 格式不正確: ${email}`);
        return res.status(400).json({ message: "Email 格式不正確" });
    }
    // 考慮國際電話號碼，可以放鬆 strictMode 或使用更複雜的驗證
    if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
        console.warn(`[POST /] 電話號碼格式不正確: ${phone}`);
        return res.status(400).json({ message: "電話號碼格式不正確" });
    }
    if (!validator.isURL(google_sheet_link, { require_protocol: true })) {
        console.warn(`[POST /] Google 表單連結格式不正確: ${google_sheet_link}`);
        return res.status(400).json({ message: "Google 表單連結格式不正確" });
    }
    if (wedding_date && !moment(wedding_date, 'YYYY-MM-DD', true).isValid()) {
        console.warn(`[POST /] 無效的婚禮日期格式: ${wedding_date}`);
        return res.status(400).json({ message: "無效的婚禮日期格式 (應為 YYYY-MM-DD)" });
    }
    if (wedding_time && !moment(wedding_time, 'HH:mm:ss', true).isValid()) {
        console.warn(`[POST /] 無效的婚禮時間格式: ${wedding_time}`);
        return res.status(400).json({ message: "無效的婚禮時間格式 (應為 HH:mm:ss)" });
    }

    // 2. 準備數據和查詢
    const formattedWeddingDate = wedding_date || null; // 如果沒有日期，存入 null
    const formattedWeddingTime = wedding_time || null; // 如果沒有時間，存入 null

    const query = `
        INSERT INTO wedding_couples (
            groom_name, bride_name, email, phone, wedding_date, wedding_time, 
            wedding_location, google_sheet_link, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        groom_name,
        bride_name,
        email,
        phone,
        formattedWeddingDate,
        formattedWeddingTime,
        wedding_location || null, // 可選字段，如果為空則存入 null
        google_sheet_link,
        'open' // 預設狀態
    ];

    try {
        const [results] = await pool.query(query, values);
        console.log(`[POST /] 成功新增客戶，ID: ${results.insertId}`);
        res.status(201).json({
            id: results.insertId,
            message: "客戶新增成功"
        });
    } catch (err) {
        // 檢查是否為重複 Email 或 Google Sheet Link 錯誤
        if (err.code === 'ER_DUP_ENTRY') {
            const field = err.sqlMessage.includes('email') ? 'Email' :
                err.sqlMessage.includes('google_sheet_link') ? 'Google 表單連結' : '未知欄位';
            console.warn(`[POST /] 新增客戶失敗：${field} 已存在`);
            return res.status(409).json({ message: `${field} 已被使用，請輸入唯一值` });
        }
        sendDbError(res, 'POST /', err, "新增客戶失敗");
    }
});

// 更新客戶狀態 (拖曳功能使用)
router.put('/:id/status', async (req, res) => {
    const customerId = parseInt(req.params.id); // 確保是整數
    const { status } = req.body;

    // 1. 驗證輸入
    if (isNaN(customerId)) {
        console.warn(`[PUT /:id/status] 無效的客戶 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的客戶 ID" });
    }
    if (!status || (status !== 'open' && status !== 'closed')) {
        console.warn(`[PUT /:id/status] 無效的狀態值: ${status}`);
        return res.status(400).json({ message: "無效的狀態值，狀態必須是 'open' 或 'closed'" });
    }

    try {
        const query = 'UPDATE wedding_couples SET status = ? WHERE id = ?';
        const [results] = await pool.query(query, [status, customerId]);

        if (results.affectedRows === 0) {
            console.warn(`[PUT /:id/status] 找不到 ID 為 ${customerId} 的客戶或狀態未改變`);
            return res.status(404).json({ message: `找不到 ID 為 ${customerId} 的客戶，或狀態已是 '${status}'` });
        }
        console.log(`[PUT /:id/status] 客戶 ID ${customerId} 狀態更新成功為 ${status}`);
        res.status(200).json({ message: "客戶狀態更新成功" });
    } catch (err) {
        sendDbError(res, `PUT /${customerId}/status`, err, "無法更新客戶狀態");
    }
});

// 獲取單個婚禮情侶 (客戶) 的詳細資料
router.get("/:id", async (req, res) => {
    const customerId = parseInt(req.params.id); // 確保是整數

    // 1. 驗證輸入
    if (isNaN(customerId)) {
        console.warn(`[GET /:id] 無效的客戶 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    try {
        // 從 wedding_couples 表中查詢數據
        const [results] = await pool.query(
            "SELECT id, groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, google_sheet_link, status FROM wedding_couples WHERE id = ?",
            [customerId]
        );

        if (results.length === 0) {
            console.warn(`[GET /:id] 找不到 ID 為 ${customerId} 的客戶資料`);
            return res.status(404).json({ message: "找不到客戶資料" });
        }
        console.log(`[GET /:id] 成功獲取客戶 ID ${customerId} 的資料`);
        res.json(results[0]);
    } catch (err) {
        sendDbError(res, `GET /${customerId}`, err, "無法獲取客戶資料");
    }
});

// 查詢單個婚禮情侶 (客戶) 的賓客資料 (從 guests 表)
router.get("/:id/guests", async (req, res) => { // 路由名稱從 /sheet-data 更改為 /guests 更具語義
    const weddingCoupleId = parseInt(req.params.id); // 確保是整數

    // 1. 驗證輸入
    if (isNaN(weddingCoupleId)) {
        console.warn(`[GET /:id/guests] 無效的婚禮情侶 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    try {
        // 從 guests 表中查詢數據
        const [results] = await pool.query(
            "SELECT id, google_sheet_guest_id, guest_name, email, is_sent, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message FROM guests WHERE wedding_couple_id = ?",
            [weddingCoupleId]
        );
        console.log(`[GET /:id/guests] 成功獲取婚禮情侶 ID ${weddingCoupleId} 的 ${results.length} 筆賓客資料`);
        // 成功獲取資料，返回賓客資料陣列 (即使為空陣列)
        res.json(results);
    } catch (err) {
        sendDbError(res, `GET /${weddingCoupleId}/guests`, err, "無法獲取賓客資料");
    }
});

module.exports = router;