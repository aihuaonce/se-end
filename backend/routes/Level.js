// backend/routes/level.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// 根據分級查詢顧客
router.get('/level', async (req, res) => {

    const { level } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT `顧客id`, `顧客姓名`, `電子信箱` FROM customer WHERE `分級` = ?',

            [level]
        );
        res.json(rows);
    } catch (error) {
        console.error('查詢顧客分級錯誤:', error);
        res.status(500).send('伺服器錯誤');
    }
});

module.exports = router;
