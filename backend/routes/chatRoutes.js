// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1. 取得所有聊天訊息（含顧客名稱）
router.get('/admin/messages', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT c.顧客姓名, ch.*
        FROM chat ch
        JOIN customer c ON ch.顧客id = c.顧客id
        ORDER BY ch.溝通時間 DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error('取得訊息錯誤:', error);  // 新增錯誤印出
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });
  

// 2. 管理員回覆訊息
router.post('/admin/reply', async (req, res) => {
    const { 顧客id, 回覆內容 } = req.body;
  
    try {
      // 1. 插入管理員的回覆訊息（含溝通時間）
      await pool.query(`
        INSERT INTO chat (顧客id, 發送者, 溝通內容, 是否回覆, 溝通時間)
        VALUES (?, 'admin', ?, 1, NOW())
      `, [顧客id, 回覆內容]);
  
      // 2. 將該顧客最新一則未回覆的 user 訊息標示為已回覆
      await pool.query(`
        UPDATE chat
        SET 是否回覆 = 1
        WHERE 顧客id = ? AND 發送者 = 'user' AND 是否回覆 = 0
        ORDER BY 溝通時間 DESC
        LIMIT 1
      `, [顧客id]);
  
      res.json({ message: '回覆成功' });
    } catch (error) {
      console.error('回覆訊息時發生錯誤:', error);
      res.status(500).json({ error: '伺服器錯誤' });
    }
  });
  
  module.exports = router;
