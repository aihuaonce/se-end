const express = require('express');
const router = express.Router();
const pool = require('../db');

// 後台預約查詢 API
router.get('/reservations', async (req, res) => {
  const { 顧客姓名, 預約類型, 狀態, 開始日期, 結束日期 } = req.query;

  let sql = `
    SELECT 
      r.預約id,
      c.顧客姓名,
      r.預約類型,
      r.預約時間,
      r.狀態
    FROM reserve r
    JOIN customer c ON r.顧客id = c.顧客id
    WHERE 1=1
  `;
  
  const params = [];

  if (顧客姓名) {
    sql += ' AND c.顧客姓名 LIKE ?';
    params.push(`%${顧客姓名}%`);
  }
  if (預約類型) {
    sql += ' AND r.預約類型 = ?';
    params.push(預約類型);
  }
  if (狀態) {
    sql += ' AND r.狀態 = ?';
    params.push(狀態);
  }
  if (開始日期 && 結束日期) {
    sql += ' AND r.預約時間 BETWEEN ? AND ?';
    params.push(開始日期, 結束日期);
  }

  sql += ' ORDER BY r.預約時間 ASC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('預約查詢錯誤：', err);
    res.status(500).json({ error: '查詢失敗' });
  }
});
// 更新預約狀態
router.put('/reservations/:id/status', async (req, res) => {
    const { id } = req.params;
    const { 狀態 } = req.body;
  
    try {
      await pool.query('UPDATE reserve SET 狀態 = ? WHERE 預約id = ?', [狀態, id]);
      res.send({ message: '狀態已更新' });
    } catch (err) {
      console.error('更新失敗：', err);
      res.status(500).send('更新預約狀態失敗');
    }
  });
  

module.exports = router;
