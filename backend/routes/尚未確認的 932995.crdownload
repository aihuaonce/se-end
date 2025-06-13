const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池
const validator = require('validator');
const moment = require('moment');

// 獲取所有客戶/賓客
router.get('/', (req, res) => {
    const query = 'SELECT * FROM projects'; // 假設您的資料表是 'projects'
    pool.query(query, (err, results) => {
        if (err) {
            console.error("[GET /projects] 查詢資料庫時發生錯誤:", err);
            return res.status(500).json({ message: "伺服器內部錯誤" });
        }
        res.json(results);

});


module.exports = router;