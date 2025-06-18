const express = require('express');
const router = express.Router();
const pool = require('../db');

// 取得所有顧客
router.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT \`顧客id\`, \`顧客姓名\`, \`電話\`, \`電子信箱\` FROM customer
    `);
    res.json(rows);
  } catch (error) {
    console.error('取得顧客資料失敗:', error);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

module.exports = router;
