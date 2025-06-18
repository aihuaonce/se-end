const express = require("express");
const router = express.Router();
const pool = require("../db.js"); // 確保 db.js 導出 Promise-based 連接池
const moment = require('moment'); // 用於日期時間驗證

// 輔助函數：統一處理資料庫錯誤響應 (從其他路由文件複製)
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
  console.error(`[${routeName}] 資料庫操作錯誤:`, error);
  res.status(500).json({
    message: `${message}: ${error.message}`,
    code: error.code || 'UNKNOWN_DB_ERROR'
  });
};

// 注意：這個路由檔案操作一個未在提供的 Schema 中定義的 'reserve' 表格。
// 下面的程式碼會保留對 'reserve' 表格的操作，但請確保你的資料庫中存在這個表格及其欄位。

// [POST] /api/reserve/reserve - 創建預約
// 路由名稱可能應該只是 /api/reserve (或者根據你 server.js 中的掛載來定)
router.post('/reserve', async (req, res) => { // 路徑改為 /reserve
  console.log("[RESERVE] 收到前端送來的資料：", req.body);

  const { customer_id, 預約類型, 預約時間, 狀態 } = req.body; // 假設前端傳遞的是 customer_id

  // 1. 輸入驗證
  if (!customer_id || isNaN(parseInt(customer_id)) || !預約類型 || !預約時間 || !狀態) {
    console.warn("[RESERVE] 缺少必要欄位或格式無效");
    return res.status(400).json({ success: false, message: "缺少必要欄位或格式無效 (客戶ID, 預約類型, 預約時間, 狀態)" });
  }
  // 驗證預約時間格式，假設是 DATETIME 格式
  if (!moment(預約時間).isValid()) { // moment() 可以自動解析多種格式
    console.warn(`[RESERVE] 無效的預約時間格式: ${預約時間}`);
    return res.status(400).json({ success: false, message: "無效的預約時間格式" });
  }
  // 狀態值的基本驗證 (假設是某幾種類型)
  // 例如：if (!['待確認', '已確認', '已取消'].includes(狀態)) { ... }

  const parsedCustomerId = parseInt(customer_id);

  try {
    // 注意：操作未在 Schema 中定義的 'reserve' 表
    const [result] = await pool.query(
      'INSERT INTO reserve (顧客id, 預約類型, 預約時間, 狀態) VALUES (?, ?, ?, ?)',
      [parsedCustomerId, 預約類型, 預約時間, 狀態] // 假設 'reserve' 表的欄位名是中文
    );

    console.log(`[RESERVE] 成功新增預約，ID: ${result.insertId}，客戶 ID: ${parsedCustomerId}`);
    res.status(201).json({ success: true, message: "預約成功", id: result.insertId }); // 201 Created
  } catch (error) {
    sendDbError(res, 'POST /api/reserve', error, '預約失敗');
  }
});

// 如果需要獲取預約列表或單個預約詳情，可以在這裡添加 GET 路由

module.exports = router;