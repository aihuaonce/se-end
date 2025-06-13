const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1. 登入功能
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM customer WHERE 電子信箱 = ? AND 密碼 = ?',
      [email, password]
    );

    if (rows.length > 0) {
      const user = rows[0]; // ✅ 拿到整筆顧客資料
      res.json({
        success: true,
        message: '登入成功',
        user: {
          id: user['顧客id'],         // ✅ 對應你資料庫的「顧客id」
          name: user['顧客姓名'],
          email: user['電子信箱'],
        },
      });
    } else {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 2. 註冊功能
router.post('/register', async (req, res) => {
  console.log("收到前端註冊資料：", req.body);
  const {
    顧客姓名,
    電話,
    電子信箱,
    喜好風格,
    生日,
    建檔時間,
    密碼
  } = req.body;

  try {
    // 檢查是否已有相同的信箱註冊過
    const [existing] = await pool.query(
      'SELECT * FROM customer WHERE 電子信箱 = ?',
      [電子信箱]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '此信箱已註冊過' });
    }

    // 寫入資料
    await pool.query(
      `INSERT INTO customer 
      (\`顧客姓名\`, \`電話\`, \`電子信箱\`, \`喜好風格\`, \`生日\`, \`建檔時間\`, \`密碼\`) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [顧客姓名, 電話, 電子信箱, 喜好風格, 生日, 建檔時間, 密碼]
    );
    

    res.json({ success: true, message: '註冊成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '伺服器錯誤，無法註冊' });
  }
});
// 取得個人資料
router.get("/api/profile", async (req, res) => {
  const { email } = req.query;

  try {
    const [rows] = await pool.query(
      `SELECT 顧客姓名, 電話, 電子信箱, 喜好風格, 
              DATE_FORMAT(生日, '%Y-%m-%d') AS 生日, 
              DATE_FORMAT(建檔時間, '%Y-%m-%d') AS 建檔時間 
       FROM customer 
       WHERE 電子信箱 = ?`,
      [email]
    );

    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] });
    } else {
      res.status(404).json({ success: false, message: "找不到使用者資料" });
    }
  } catch (err) {
    console.error("取得個人資料錯誤：", err);
    res.status(500).json({ success: false, message: "伺服器錯誤" });
  }
});



module.exports = router; 