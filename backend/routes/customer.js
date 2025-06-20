const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保 pool 是 Promise-based 的

// 統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
  console.error(`[Backend ${routeName}] 資料庫操作錯誤:`, error);
  // 根據環境返回不同詳細程度的錯誤信息
  const errorMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message}`;
  res.status(500).json({
    message: errorMessage,
    code: error.code || 'UNKNOWN_DB_ERROR'
  });
};


// 取得所有客戶資料 (對應新的 customers 表)
router.get('/customers', async (req, res) => {
  try {
    // 修改查詢語句，使用新的表格名稱和欄位名稱
    const [rows] = await pool.query(`
      SELECT customer_id, contact_person, phone, email FROM customers
    `);
    console.log(`[Backend GET /customers] 成功取得 ${rows.length} 筆客戶資料`);
    res.json(rows);
  } catch (error) {
    sendDbError(res, 'GET /customers', error, '取得客戶資料失敗');
  }
});

module.exports = router;