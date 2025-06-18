const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池

// 輔助函數：統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    res.status(500).json({
        message: `${message}: ${error.message}`,
        code: error.code || 'UNKNOWN_DB_ERROR'
    });
};

// GET /api/vendors - 獲取所有廠商推薦數據，支持類別篩選和文字搜尋
router.get('/', async (req, res) => {
    const { category, query } = req.query; // 從查詢參數獲取 category 和 query

    let sql = 'SELECT * FROM vendors WHERE 1=1'; // 基礎查詢
    const params = [];

    if (category && category !== 'all') {
        sql += ` AND category = ?`;
        params.push(category);
    }

    if (query) {
        const lowerCaseQuery = `%${query.toLowerCase()}%`;
        sql += ` AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(contact_person) LIKE ?)`;
        params.push(lowerCaseQuery, lowerCaseQuery, lowerCaseQuery);
    }

    sql += ' ORDER BY name ASC'; // 排序

    try {
        const [rows] = await pool.query(sql, params); // 執行查詢
        res.json(rows); // 返回查詢結果
    } catch (err) {
        sendDbError(res, 'GET /api/vendors', err, "無法獲取廠商推薦資料");
    }
});

// GET /api/vendor-categories - 獲取所有獨特的廠商類別
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT category FROM vendors ORDER BY category ASC');
        res.json(rows.map(row => row.category)); // 返回類別名稱的陣列
    } catch (err) {
        sendDbError(res, 'GET /api/vendor-categories', err, "無法獲取廠商類別");
    }
});

// GET /api/vendors/:vendor_id - 獲取特定 ID 的廠商詳細資料
router.get('/:vendor_id', async (req, res) => {
    const { vendor_id } = req.params;

    try {
        const sql = 'SELECT * FROM vendors WHERE vendor_id = ?';
        const [rows] = await pool.query(sql, [vendor_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: '找不到指定的廠商。' });
        }

        res.json(rows[0]); // 返回找到的廠商資料
    } catch (err) {
        sendDbError(res, 'GET /api/vendors/:vendor_id', err, "無法獲取廠商詳細資料");
    }
});

// POST /api/vendors - 新增廠商
router.post('/', async (req, res) => {
    const { name, category, contact_person, phone, rating, description, website } = req.body;

    if (!name || !category || !contact_person || !phone || !rating) {
        return res.status(400).json({ message: '所有欄位都是必填的。' });
    }

    const sql = `
        INSERT INTO vendors (name, category, contact_person, phone, rating, description, website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await pool.query(sql, [name, category, contact_person, phone, rating, description, website]);
        const newVendorId = result.insertId; // 獲取新插入的 ID
        res.status(201).json({ message: '廠商新增成功。', vendor_id: newVendorId });
    } catch (err) {
        sendDbError(res, 'POST /api/vendors', err, "無法新增廠商");
    }
});

// PUT /api/vendors/:vendor_id - 更新特定 ID 的廠商資料
router.put('/:vendor_id', async (req, res) => {
    const { vendor_id } = req.params;
    const { name, category, contact_person, phone, rating, description, website } = req.body;

    const sql = `
        UPDATE vendors 
        SET name = ?, category = ?, contact_person = ?, phone = ?, rating = ?, description = ?, website = ?
        WHERE vendor_id = ?
    `;

    try {
        const [result] = await pool.query(sql, [name, category, contact_person, phone, rating, description, website, vendor_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '找不到指定的廠商。' });
        }

        res.json({ message: '廠商資料更新成功。' });
    } catch (err) {
        sendDbError(res, 'PUT /api/vendors/:vendor_id', err, "無法更新廠商資料");
    }
});

// DELETE /api/vendors/:vendor_id - 刪除特定 ID 的廠商
router.delete('/:vendor_id', async (req, res) => {
    const { vendor_id } = req.params;

    const sql = 'DELETE FROM vendors WHERE vendor_id = ?';

    try {
        const [result] = await pool.query(sql, [vendor_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '找不到指定的廠商。' });
        }

        res.json({ message: '廠商刪除成功。' });
    } catch (err) {
        sendDbError(res, 'DELETE /api/vendors/:vendor_id', err, "無法刪除廠商");
    }
});


module.exports = router;