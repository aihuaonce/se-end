const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池，確保它返回的是 Promise-based 的連接池 (mysql2/promise)

// 從其他路由檔案複製過來的輔助函數，用於統一錯誤處理
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    res.status(500).json({
        message: `${message}: ${error.message}`,
        code: error.code || 'UNKNOWN_DB_ERROR'
    });
};

// GET / - 獲取所有婚禮方案列表
// 對應前端 HomePages.jsx 的 fetch (假設掛載在 /api/plans)
router.get('/', async (req, res) => {
    // 這個路由不需要事務
    const query = `
        SELECT
            plan_id,
            plan_name,         -- 從 wedding_plans 獲取方案名稱
            plan_description,
            suggested_style,   -- 從 wedding_plans 獲取建議風格
            price
        FROM wedding_plans
        ORDER BY plan_id ASC -- 或按價格、名稱排序等等
    `;

    try {
        const [rows] = await pool.execute(query); // 執行查詢
        res.json(rows); // 返回查詢結果
    } catch (err) {
        sendDbError(res, 'GET /api/plans', err, "無法獲取婚禮方案資料");
    }
});

// 如果需要獲取單一方案的詳細資料，可以在這裡新增 GET /:id 路由
// 對應前端創建專案頁面可能需要獲取方案詳情
router.get('/:id', async (req, res) => {
    const planId = req.params.id;
    // 簡單驗證輸入
    if (!planId || isNaN(parseInt(planId))) {
        return res.status(400).json({ success: false, message: '無效的方案 ID。' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT
                plan_id,
                plan_name,
                plan_description,
                suggested_style,
                price
            FROM wedding_plans
            WHERE plan_id = ?`,
            [planId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: '找不到指定的婚禮方案。' });
        }

        res.json(rows[0]); // 返回單個方案資料
    } catch (err) {
        sendDbError(res, 'GET /api/plans/:id', err, '無法獲取單一方案資料');
    }
});


module.exports = router;