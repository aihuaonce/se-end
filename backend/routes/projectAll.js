// routes/projectAll.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  const query = `
    SELECT 
      project_id, 
      client_name, 
      DATE_FORMAT(wedding_date, '%Y-%m-%d') AS wedding_date, 
      plan_id, 
      project_status, 
      DATE_FORMAT(project_build_time, '%Y-%m-%d') AS project_build_time
    FROM projects
    ORDER BY project_build_time DESC
  `;

  try {
    const [results] = await pool.execute(query); // ✅ 改為 execute
    res.json(results);
  } catch (err) {
    console.error("[GET /api/projectall] 查詢錯誤:", err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

module.exports = router;
