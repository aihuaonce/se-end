const express = require("express");
const router = express.Router();
const pool = require("../db.js");

router.post('/reserve', async (req, res) => {
  console.log("收到前端送來的資料：", req.body);

  try {
    const { 顧客id, 預約類型, 預約時間, 狀態 } = req.body;

    const [result] = await pool.query(
      'INSERT INTO reserve (顧客id, 預約類型, 預約時間, 狀態) VALUES (?, ?, ?, ?)',
      [顧客id, 預約類型, 預約時間, 狀態]
    );

    res.json({ success: true, message: "預約成功", id: result.insertId });
  } catch (error) {
    console.error("預約失敗：", error);
    res.status(500).json({ success: false, error: "預約失敗" });
  }
});

module.exports = router;
