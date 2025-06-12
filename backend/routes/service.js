// backend/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保這個 pool 是 Promise-based 的
const validator = require('validator');
const moment = require('moment');

// 獲取所有客戶/賓客
router.get('/', async (req, res) => { // <--- 標記為 async
    const query = 'SELECT * FROM customers';
    try {
        const [results] = await pool.query(query); // <--- 使用 await
        res.json(results);
    } catch (err) {
        console.error("[GET /customers] 查詢資料庫時發生錯誤:", err);
        res.status(500).json({ message: "伺服器內部錯誤" });
    }
});

// 新增客戶/賓客
router.post('/', async (req, res) => { // <--- 標記為 async
    const { groom_name, bride_name, email, phone, wedding_date, wedding_location, form_link } = req.body;

    // 驗證輸入
    if (!groom_name || !bride_name || !email || !phone) {
        return res.status(400).json({ message: "缺少必要欄位：新郎姓名、新娘姓名、Email 或電話號碼" });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Email 格式不正確" });
    }
    if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
        return res.status(400).json({ message: "電話號碼格式不正確" });
    }

    // 轉換日期格式以便存入資料庫
    const formattedWeddingDate = wedding_date ? moment(wedding_date).format('YYYY-MM-DD HH:mm:ss') : null;

    const query = `INSERT INTO customers (groom_name, bride_name, email, phone, wedding_date, wedding_location, form_link, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [groom_name, bride_name, email, phone, formattedWeddingDate, wedding_location, form_link, 'open'];

    try {
        const [results] = await pool.query(query, values); // <--- 使用 await
        res.status(201).json({ id: results.insertId, message: "客戶新增成功" });
    } catch (err) {
        console.error("新增客戶失敗:", err);
        res.status(500).json({ message: "伺服器內部錯誤" });
    }
});

// 更新客戶狀態 (拖曳功能使用)
router.put('/:id/status', async (req, res) => { // <--- 標記為 async
    const customerId = req.params.id;
    const { status } = req.body;

    // 簡單驗證狀態值
    if (!status || (status !== 'open' && status !== 'closed')) {
        return res.status(400).json({ message: "無效的狀態值，狀態必須是 'open' 或 'closed'" });
    }

    const query = 'UPDATE customers SET status = ? WHERE id = ?';
    try {
        const [results] = await pool.query(query, [status, customerId]); // <--- 使用 await
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: `找不到 ID 為 ${customerId} 的客戶` });
        }
        res.status(200).json({ message: "客戶狀態更新成功" });
    } catch (err) {
        console.error(`更新客戶 ${customerId} 狀態錯誤:`, err);
        res.status(500).json({ message: "伺服器內部錯誤，無法更新客戶狀態" });
    }
});

// 刪除客戶
router.delete('/:id', async (req, res) => { // <--- 標記為 async
    const customerId = req.params.id;
    const query = 'DELETE FROM customers WHERE id = ?';
    try {
        const [results] = await pool.query(query, [customerId]); // <--- 使用 await
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "找不到要刪除的客戶" });
        }
        res.status(200).json({ message: "客戶刪除成功" });
    } catch (err) {
        console.error(`刪除客戶 ${customerId} 錯誤:`, err);
        res.status(500).json({ message: "伺服器內部錯誤" });
    }
});

router.get("/:id", async (req, res) => { // <--- 標記為 async
    const { id } = req.params;
    // 簡單驗證 id 是否為數字
    if (!validator.isInt(id)) {
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    try {
        const [results] = await pool.query("SELECT id, groom_name, bride_name, email, phone, wedding_date, wedding_time, wedding_location, google_sheet_link FROM customers WHERE id = ?", [id]); // <--- 使用 await
        if (results.length === 0) {
            return res.status(404).json({ message: "找不到客戶資料" });
        }
        res.json(results[0]);
    } catch (err) {
        console.error("抓取單個客戶資料錯誤:", err);
        res.status(500).json({ message: "伺服器錯誤，無法獲取客戶資料" });
    }
});

// 查詢單個客戶的賓客資料
router.get("/:id/sheet-data", async (req, res) => { // <--- 標記為 async
    const { id } = req.params;
    // 簡單驗證 id 是否為數字
    if (!validator.isInt(id)) {
        return res.status(400).json({ message: "無效的客戶 ID" });
    }

    try {
        // 注意這裡查詢了 google_sheet_guest_id 欄位
        const [results] = await pool.query( // <--- 使用 await
            "SELECT id, google_sheet_guest_id, guest_name, email, is_sent, relationshipWithGroom, relationshipWithBride, relationshipWithCouple, guestDescription, sharedMemories, message FROM guests WHERE customer_id = ?",
            [id]
        );
        // 成功獲取資料，返回賓客資料陣列 (即使為空陣列)
        res.json(results);
    } catch (err) {
        console.error("抓取賓客資料錯誤:", err);
        res.status(500).json({ message: "伺服器錯誤，無法獲取賓客資料" });
    }
});

module.exports = router;