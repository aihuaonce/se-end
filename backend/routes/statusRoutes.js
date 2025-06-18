const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池，確保它返回的是 Promise-based 的連接池 (mysql2/promise)
const validator = require('validator'); // 用於驗證輸入
// 統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    const errorMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message}`;
    res.status(500).json({ message: errorMessage, code: error.code || 'UNKNOWN_DB_ERROR' });
};
router.post('/', async (req, res) => { // 將路由處理函數標記為 async
    // 從請求體中解構 guest_id 和 status (is_sent 狀態 0 或 1)
    const { guest_id, status } = req.body;
    console.log(`[STATUS] 接收到更新賓客寄送狀態請求：賓客 ID: ${guest_id}, 狀態: ${status}`);
    // 1. 驗證輸入
    if (guest_id === undefined || status === undefined) {
        console.warn("[STATUS] 缺少 guest_id 或 status 參數");
        return res.status(400).json({ message: "缺少 guest_id 或 status 參數" });
    }
    // 驗證 guest_id 是否為正整數，status 是否為 0 或 1
    if (!validator.isInt(String(guest_id), { gt: 0 }) || !validator.isIn(String(status), ['0', '1'])) {
        console.warn(`[STATUS] 無效的 guest_id 或 status 值：${guest_id}, ${status}`);
        return res.status(400).json({ message: "無效的 guest_id 或 status 值" });
    }
    try {
        const guestIdInt = parseInt(guest_id);
        const statusInt = parseInt(status); // 將狀態轉換為整數 (0 或 1)
        // 2. 更新資料庫中的資料 - 修正表格名稱和欄位 (WHERE 條件使用新的主鍵 guest_id)
        const query = 'UPDATE guests SET is_sent = ?, updated_at = CURRENT_TIMESTAMP WHERE guest_id = ?'; // <--- 這裡修正 WHERE 條件！
        const [results] = await pool.query(query, [statusInt, guestIdInt]); // 使用 await 執行 Promise-based 查詢
        // 3. 檢查更新結果
        if (results.affectedRows === 0) {
            console.warn(`[STATUS] 找不到要更新的賓客 ID: ${guestIdInt}，或狀態已相同`);
            // 可以檢查是否因為狀態相同而沒有更新
            const [checkStatus] = await pool.query('SELECT is_sent FROM guests WHERE guest_id = ?', [guestIdInt]);
            if (checkStatus.length > 0 && checkStatus[0].is_sent === statusInt) {
                return res.status(200).json({ message: `賓客寄送狀態已是目標值 ${statusInt}，無需更新。` });
            }
            return res.status(404).json({ message: "找不到要更新的賓客，或其寄送狀態已是目標值" });
        }
        console.log(`[STATUS] 賓客 ID ${guestIdInt} 的寄送狀態更新成功為 ${statusInt}`);
        res.status(200).json({ message: "賓客寄送狀態更新成功" });
    } catch (error) { // 捕獲所有錯誤
        console.error("[STATUS] 更新賓客寄送狀態時發生錯誤:", error);
        sendDbError(res, `POST /update-status`, error, "更新賓客寄送狀態失敗");
    }
});
module.exports = router;