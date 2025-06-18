const express = require('express');
const router = express.Router();
const pool = require('../db');

// 輔助函數：統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
  console.error(`[${routeName}] 資料庫操作錯誤:`, error);
  res.status(500).json({
    message: `${message}: ${error.message}`,
    code: error.code || 'UNKNOWN_DB_ERROR'
  });
};

// GET / - 獲取所有專案列表
router.get('/', async (req, res) => {
  const query = `
    SELECT
      p.project_id,
      p.client_name,
      DATE_FORMAT(p.wedding_date, '%Y-%m-%d') AS wedding_date,
      p.plan_id,
      wp.project_name AS plan_name, -- 從 wedding_plans 獲取方案名稱
      p.project_status,
      DATE_FORMAT(p.project_build_time, '%Y-%m-%d') AS project_build_time
    FROM projects p
    LEFT JOIN wedding_plans wp ON p.plan_id = wp.plan_id -- JOIN wedding_plans 表格
    ORDER BY p.project_build_time DESC
  `;

  try {
    const [results] = await pool.execute(query);
    res.json(results);
  } catch (err) {
    sendDbError(res, 'GET /api/projects', err, "無法獲取專案列表");
  }
});

// GET /:id - 獲取特定 ID 的專案詳情
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM project_details WHERE project_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '找不到此專案詳情' });
    }
    res.json(rows[0]); // 返回找到的單一專案詳情資料
  } catch (err) {
    sendDbError(res, 'GET /api/projects/:id', err, "無法獲取單一專案詳情");
  }
});

// PUT /:id - 更新特定 ID 的專案詳情
router.put('/:id', async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body;

  const allowedUpdates = ['groom_name', 'bride_name', 'client_name', 'phone_num', 'wedding_date', 'wedding_place', 'budget_id', 'plan_id', 'wedding_style', 'remark']; // 假設 remark 是對應前端 note 的欄位，請根據實際情況調整

  const updateData = {};
  for (const key in updates) {
    if (allowedUpdates.includes(key)) {
      updateData[key] = updates[key];
    }
  }

  const updateKeys = Object.keys(updateData);
  if (updateKeys.length === 0) {
    return res.status(400).json({ message: '沒有提供有效要更新的欄位' });
  }

  // 自動加入更新時間 (如果 project_details 表格有這個欄位且需要後端更新)
  updateData.project_update_time = new Date(); // 使用後端時間戳

  const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updateData);

  const sql = `UPDATE project_details SET ${fields} WHERE project_id = ?`;

  try {
    const [result] = await pool.query(sql, [...values, projectId]);

    if (result.affectedRows === 0) {
      console.warn(`PUT /api/projects/${projectId}: No rows affected. Data might be the same or ID not found.`);
    }

    res.json({ message: '專案資料更新成功', project_id: projectId }); // 返回成功訊息
  } catch (err) {
    sendDbError(res, 'PUT /api/projects/:id', err, "更新專案資料失敗");
  }
});

module.exports = router;