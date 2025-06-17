const express = require('express');
const router = express.Router();
const pool = require('../db');

// 正確設成 /api/project 對應前端 fetch
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT plan_id, project_name, plan_description, price
      FROM wedding_plans
    `);
    res.json(rows);
  } catch (error) {
    console.error("取得婚禮專案資料時錯誤:", error);
    res.status(500).json({ message: '伺服器錯誤', error: error.message });
  }
});

module.exports = router;
