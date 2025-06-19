require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const sendError = (res, routeName, error, message = "伺服器內部錯誤", statusCode = 500) => {
  console.error(`[Backend ${routeName}] 錯誤:`, error);
  const errorMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message}`;
  res.status(statusCode).json({ success: false, message: errorMessage });
};

// 登入路由 (保持不變)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "請輸入使用者名稱和密碼。" });
  }
  try {
    const [users] = await pool.query('SELECT user_id, username, password_hash, role FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "使用者名稱或密碼不正確。" });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "使用者名稱或密碼不正確。" });
    }
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log(`[Backend POST /api/auth/login] 使用者 ${username} 登入成功。`);
    res.json({
      success: true,
      message: "登入成功！",
      token,
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    sendError(res, 'POST /api/auth/login', err, "登入失敗");
  }
});

// 註冊路由 (保持與上次提供的程式碼一致)
router.post('/register', async (req, res) => {
  const { username, password, email, role } = req.body; // role 可以由前端指定，也可以讓後端預設

  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: "使用者名稱、密碼和電子郵件為必填項。" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "密碼長度至少為 6 個字元。" });
  }

  try {
    const [existingUsers] = await pool.query('SELECT user_id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.username === username) {
        return res.status(409).json({ success: false, message: "使用者名稱已存在。" });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ success: false, message: "電子郵件已存在。" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, role || 'staff'] // 預設角色為 'staff'
    );

    console.log(`[Backend POST /api/auth/register] 新使用者 ${username} 註冊成功。`);
    res.status(201).json({
      success: true,
      message: "註冊成功！",
      userId: result.insertId,
      username: username,
      email: email
    });

  } catch (err) {
    sendError(res, 'POST /api/auth/register', err, "註冊失敗");
  }
});

module.exports = router;