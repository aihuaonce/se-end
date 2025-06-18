const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/fullcreate
router.post("/", async (req, res) => {
  const { client_name, wedding_date, plan_id } = req.body;

  // 基本輸入檢查
  if (!client_name || !wedding_date || !plan_id) {
    return res.status(400).json({ error: "缺少必要欄位" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 準備建立日期（YYYY-MM-DD）
    const now = new Date();
    const buildDate = now.toISOString().slice(0, 10); // "2025-06-16"

    // 新增專案
    const insertProjectSql = `
      INSERT INTO projects (
        client_name, wedding_date, plan_id, project_status, project_build_time
      ) VALUES (?, ?, ?, '進行中', ?)
    `;

    const [result] = await connection.execute(insertProjectSql, [
      client_name,
      wedding_date,
      plan_id,
      buildDate,
    ]);

    const project_id = result.insertId;

    await connection.commit();

    res.status(200).json({
      message: "專案建立成功",
      project_id,
    });
  } catch (err) {
    await connection.rollback();
    console.error("建立專案錯誤：", err);
    res.status(500).json({
      error: "建立專案失敗",
      detail: err.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
