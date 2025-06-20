const express = require('express');
const router = express.Router();
const pool = require('../db');
// 假設您有 JWT 驗證中間件
// const authMiddleware = require('../middleware/authMiddleware'); // 引入您的 JWT 中間件

// 1. 取得所有聊天訊息（含顧客名稱）
// router.get('/admin/messages', authMiddleware, async (req, res) => { // 加上 JWT 中間件
router.get('/admin/messages', async (req, res) => { // 如果暫時沒有 JWT 中間件
  try {
    // 使用新的表名 chat_messages 和英文列名
    // 假設 customers 表名為 customers，主鍵為 customer_id，顯示的顧客名為 name
    const [rows] = await pool.query(`
        SELECT 
            c.name AS customer_name,  -- 從 customers 表獲取英文名字段
            cm.message_id,
            cm.customer_id,
            cm.project_id,            -- 如果您在 chat_messages 中添加了 project_id
            cm.content,
            cm.sent_at,
            cm.sender_type,
            cm.is_replied
        FROM chat_messages cm
        LEFT JOIN customers c ON cm.customer_id = c.customer_id -- JOIN customers 表
        ORDER BY cm.sent_at DESC
      `);
    res.json(rows);
  } catch (error) {
    console.error('取得訊息錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤，無法獲取訊息' });
  }
});


// 2. 管理員回覆訊息
// router.post('/admin/reply', authMiddleware, async (req, res) => { // 加上 JWT 中間件
router.post('/admin/reply', async (req, res) => { // 如果暫時沒有 JWT 中間件
  // 前端發送的請求體也應該使用英文鍵名
  const { customer_id, reply_content, project_id } = req.body; // 假設前端會傳 project_id (可選)

  if (!customer_id || !reply_content) {
    return res.status(400).json({ error: '顧客ID和回覆內容為必填項。' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. 插入管理員的回覆訊息
    // 使用新的表名 chat_messages 和英文列名
    // sender_type 已經是 'admin'，is_replied 對 admin 消息意義不大，可以設為0或不插入
    const [insertResult] = await connection.query(`
        INSERT INTO chat_messages (customer_id, project_id, sender_type, content, is_replied, sent_at)
        VALUES (?, ?, 'admin', ?, 0, NOW()) 
      `, [customer_id, project_id || null, reply_content]);
    // is_replied 設為 0，因為管理員消息本身不需要被「回覆」

    // 2. 將該顧客最新一則未回覆的 user 訊息標示為已回覆
    // 使用新的表名 chat_messages 和英文列名
    const [updateResult] = await connection.query(`
        UPDATE chat_messages
        SET is_replied = 1
        WHERE customer_id = ? AND sender_type = 'user' AND is_replied = 0
        ORDER BY sent_at DESC
        LIMIT 1
      `, [customer_id]);

    await connection.commit();
    // 可以選擇返回新插入的消息，以便前端即時更新
    const newMessageId = insertResult.insertId;
    const [newMessages] = await connection.query('SELECT * FROM chat_messages WHERE message_id = ?', [newMessageId]);

    res.json({
      message: '回覆成功',
      replied_message_count: updateResult.affectedRows, // 更新了多少條用戶消息的狀態
      new_admin_message: newMessages.length > 0 ? newMessages[0] : null
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('回覆訊息時發生錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤，回覆失敗' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;