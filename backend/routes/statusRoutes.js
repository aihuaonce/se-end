// backend/routes/statusRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池
const validator = require('validator'); // 用於驗證輸入

// 更新賓客的寄送狀態 (is_sent)
router.post('/', (req, res) => {
    const { guest_id, status } = req.body; // 注意這裡的 status 是指 is_sent 的狀態 (0 或 1)

    // 簡單驗證輸入
    if (guest_id === undefined || status === undefined) {
        return res.status(400).json({ message: "缺少 guest_id 或 status 參數" });
    }
    // 驗證 guest_id 是否為數字，status 是否為 0 或 1
    if (!validator.isInt(String(guest_id)) || !validator.isIn(String(status), ['0', '1'])) {
        return res.status(400).json({ message: "無效的 guest_id 或 status 值" });
    }

    // 更新資料庫中的資料
    const query = 'UPDATE customers SET is_sent = ? WHERE id = ?'; // 假設是 'customers' 表
    pool.query(query, [status, guest_id], (err, results) => {
        if (err) {
            console.error("更新賓客寄送狀態失敗:", err);
            return res.status(500).json({ message: "伺服器內部錯誤" });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "找不到要更新的賓客" });
        }
        res.status(200).json({ message: "賓客寄送狀態更新成功" });
    });
});

module.exports = router;