const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池，確保它返回的是 Promise-based 的連接池 (mysql2/promise)
const validator = require('validator'); // 用於驗證輸入

router.post('/', async (req, res) => { // 將路由處理函數標記為 async
    const { guest_id, status } = req.body; // 注意這裡的 status 是指 is_sent 的狀態 (0 或 1)
    console.log(`[STATUS] 接收到更新賓客寄送狀態請求：賓客 ID: ${guest_id}, 狀態: ${status}`);

    // 1. 簡單驗證輸入
    if (guest_id === undefined || status === undefined) {
        console.warn("[STATUS] 缺少 guest_id 或 status 參數");
        return res.status(400).json({ message: "缺少 guest_id 或 status 參數" });
    }
    // 驗證 guest_id 是否為數字，status 是否為 0 或 1
    if (!validator.isInt(String(guest_id)) || !validator.isIn(String(status), ['0', '1'])) {
        console.warn(`[STATUS] 無效的 guest_id 或 status 值：${guest_id}, ${status}`);
        return res.status(400).json({ message: "無效的 guest_id 或 status 值" });
    }

    try {
        const guestIdInt = parseInt(guest_id);
        const statusInt = parseInt(status); // 將狀態轉換為整數 (0 或 1)

        // 2. 更新資料庫中的資料 - 修正表格名稱和欄位
        const query = 'UPDATE guests SET is_sent = ? WHERE id = ?'; // <--- 這裡已修正！
        const [results] = await pool.query(query, [statusInt, guestIdInt]); // 使用 await 執行 Promise-based 查詢

        // 3. 檢查更新結果
        if (results.affectedRows === 0) {
            console.warn(`[STATUS] 找不到要更新的賓客 ID: ${guestIdInt}，或狀態已相同`);
            return res.status(404).json({ message: "找不到要更新的賓客，或其寄送狀態已是目標值" });
        }

        console.log(`[STATUS] 賓客 ID ${guestIdInt} 的寄送狀態更新成功為 ${statusInt}`);
        res.status(200).json({ message: "賓客寄送狀態更新成功" });

    } catch (error) {
        // 捕獲所有錯誤
        console.error("[STATUS] 更新賓客寄送狀態時發生錯誤:", error);
        res.status(500).json({
            message: "伺服器內部錯誤",
            error: error.message, // 提供錯誤信息給前端
            code: error.code || 'UNKNOWN_ERROR' // 如果有 MySQL 錯誤碼，也提供
        });
    }
});

module.exports = router;