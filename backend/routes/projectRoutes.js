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

//projectAll
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

//projectdetail
// 取得所有任務（含月份篩選）
router.get('/api/projectdetail', async (req, res) => {
  try {
    const { month } = req.query; // e.g., "2025-06"

    let query = 'SELECT * FROM project_tasks';
    const params = [];

    if (month) {
      query += ' WHERE DATE_FORMAT(start_date, "%Y-%m") = ?';
      params.push(month);
    }

    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (err) {
    console.error('❌ 抓取 project_tasks 錯誤:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 取得專案詳情列表
router.get('/api/projectdetail', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM project_details');
    res.json(results);
  } catch (error) {
    console.error('❌ 無法取得 project_details：', error);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});
router.post('/api/projectdetail', async (req, res) => {
    const {
      groom_name,
      bride_name,
      client_name,
      phone_num,
      wedding_date,
      wedding_place,
      budget_id,
      plan_id,
      wedding_style
    } = req.body;
  
    try {
      const query = `
        INSERT INTO project_details 
        (groom_name, bride_name, client_name, phone_num, wedding_date, wedding_place, budget_id, plan_id, wedding_style, project_build_time, project_update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
  
      const values = [
        groom_name,
        bride_name,
        client_name,
        phone_num,
        wedding_date,
        wedding_place,
        budget_id,
        plan_id,
        wedding_style
      ];
  
      const [result] = await pool.query(query, values);
      res.status(201).json({ message: '新增成功', id: result.insertId });
    } catch (err) {
      console.error('❌ 新增專案失敗:', err);
      res.status(500).json({ message: '伺服器錯誤' });
    }
  });
router.get('/api/projectdetail/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM project_details WHERE project_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '找不到此專案' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ 抓取單一 project_details 錯誤:', err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

router.put('/api/projectdetail/:id', async (req, res) => {
    const projectId = req.params.id;
    const updates = req.body;
  
    try {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
  
      await pool.query(`UPDATE project_details SET ${fields} WHERE project_id = ?`, [...values, projectId]);
      res.json({ message: '更新成功' });
    } catch (err) {
      console.error('❌ 更新資料失敗:', err);
      res.status(500).json({ message: '伺服器錯誤' });
    }
  });



module.exports = router;
