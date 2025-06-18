const express = require('express');
const router = express.Router();
const pool = require('../db'); // 引入資料庫連接池，確保它返回的是 Promise-based 的連接池 (mysql2/promise)
const validator = require('validator'); // 用於驗證輸入

// 輔助函數：統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    res.status(500).json({
        message: `${message}: ${error.message}`,
        code: error.code || 'UNKNOWN_DB_ERROR'
    });
};

// GET / - 獲取所有廠商推薦數據，支持類別篩選和文字搜尋
// 對應前端 VendorPage.jsx 的 fetch (假設掛載在 /api/vendors)
router.get('/', async (req, res) => {
    // 這個路由不需要事務
    const { category, query } = req.query; // 從查詢參數獲取 category 和 query

    let sql = 'SELECT * FROM vendors WHERE 1=1'; // 基礎查詢
    const params = [];

    // 篩選 category
    if (category && category !== 'all') {
        sql += ` AND category = ?`;
        params.push(category);
    }

    // 搜尋 query
    if (query) {
        const lowerCaseQuery = `%${query.toLowerCase()}%`;
        // 搜尋 name, category, contact_person (根據新的 Schema)
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

// GET /categories - 獲取所有獨特的廠商類別
// 對應前端 VendorPage.jsx 的 fetch (假設掛載在 /api/vendors)
router.get('/categories', async (req, res) => {
    // 這個路由不需要事務
    try {
        // 從 vendors 表格獲取所有不同的 category
        const [rows] = await pool.query('SELECT DISTINCT category FROM vendors WHERE category IS NOT NULL AND category != "" ORDER BY category ASC'); // 排除空或 null 的類別
        res.json(rows.map(row => row.category)); // 返回類別名稱的陣列
    } catch (err) {
        sendDbError(res, 'GET /api/vendors/categories', err, "無法獲取廠商類別");
    }
});

// GET /:vendor_id - 獲取特定 ID 的廠商詳細資料
// 對應前端 VendorPage.jsx 查看詳情 (假設掛載在 /api/vendors)
router.get('/:vendor_id', async (req, res) => {
    const vendor_id = req.params.vendor_id;
    // 簡單驗證輸入
    if (!vendor_id || isNaN(parseInt(vendor_id)) || parseInt(vendor_id) <= 0) {
        return res.status(400).json({ message: '無效的廠商 ID。' });
    }


    // 這個路由不需要事務
    try {
        // 從 vendors 表格查詢特定廠商
        const sql = 'SELECT * FROM vendors WHERE vendor_id = ?';
        const [rows] = await pool.query(sql, [vendor_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: '找不到指定的廠商。' });
        }

        res.json(rows[0]); // 返回找到的廠商資料 (單個對象)
    } catch (err) {
        sendDbError(res, 'GET /api/vendors/:vendor_id', err, "無法獲取廠商詳細資料");
    }
});

// POST / - 新增廠商
// 對應前端某個新增廠商的表單提交 (假設掛載在 /api/vendors)
router.post('/', async (req, res) => {
    // 接收前端數據
    const { name, category, contact_person, phone, rating, description, website } = req.body; // 根據新的 Schema 欄位名

    // 驗證必填欄位
    if (!name || !category || !contact_person || !phone || rating == null) { // rating 也需要驗證是否存在
        return res.status(400).json({ message: '廠商名稱、類別、聯絡人、電話、評分都是必填的。' });
    }
    // 驗證 rating 是否為有效數字
    const parsedRating = parseFloat(rating);
    if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        return res.status(400).json({ message: '評分必須是介於 0 到 5 之間的數字。' });
    }
    // 驗證電話格式
    if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
        return res.status(400).json({ message: "無效的電話號碼格式" });
    }
    // 驗證 website 格式 (如果提供了)
    if (website && website.trim() !== '' && !validator.isURL(website, { require_protocol: true })) {
        return res.status(400).json({ message: "無效的網站連結格式 (需要包含 http:// 或 https://)" });
    }


    // 插入 SQL 語句
    const sql = `
        INSERT INTO vendors (name, category, contact_person, phone, rating, description, website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        name,
        category,
        contact_person,
        phone,
        parsedRating, // 使用解析後的 rating
        description || null, // description 可選
        website || null // website 可選
    ];


    // 這個路由不需要事務
    try {
        const [result] = await pool.query(sql, values); // 執行插入
        const newVendorId = result.insertId; // 獲取新插入的 ID
        console.log(`[POST /api/vendors] 成功新增廠商，ID: ${newVendorId}`);
        res.status(201).json({ message: '廠商新增成功。', vendor_id: newVendorId }); // 新增成功返回 201
    } catch (err) {
        // 檢查是否為重複名稱或 Email 錯誤 (如果設定了唯一約束)
        if (err.code === 'ER_DUP_ENTRY') {
            const field = err.sqlMessage.includes('name') ? '廠商名稱' :
                err.sqlMessage.includes('email') ? 'Email' : '未知欄位';
            console.warn(`[POST /api/vendors] 新增廠商失敗：${field} 已存在`);
            return res.status(409).json({ message: `${field} 已被使用，請輸入唯一值` });
        }
        sendDbError(res, 'POST /api/vendors', err, "無法新增廠商");
    }
});

// PUT /:vendor_id - 更新特定 ID 的廠商資料
// 對應前端某個編輯廠商的表單提交 (假設掛載在 /api/vendors)
router.put('/:vendor_id', async (req, res) => {
    const vendor_id = req.params.vendor_id;
    const updates = req.body; // 包含要更新的欄位和值

    // 簡單驗證 vendor_id
    if (!vendor_id || isNaN(parseInt(vendor_id)) || parseInt(vendor_id) <= 0) {
        return res.status(400).json({ message: '無效的廠商 ID。' });
    }
    const vendorIdInt = parseInt(vendor_id);

    // 過濾掉不允許直接更新的欄位 (例如 primary key, auto-generated fields)
    const allowedUpdates = ['name', 'category', 'contact_person', 'phone', 'rating', 'description', 'website'];

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

    // 驗證更新的欄位值 (部分驗證，根據需要擴充)
    if (updateData.rating !== undefined) {
        const parsedRating = parseFloat(updateData.rating);
        if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
            return res.status(400).json({ message: '評分必須是介於 0 到 5 之間的數字。' });
        }
        updateData.rating = parsedRating; // 使用解析後的數字
    }
    if (updateData.phone !== undefined && updateData.phone.trim() !== '' && !validator.isMobilePhone(updateData.phone, 'any', { strictMode: false })) {
        return res.status(400).json({ message: "無效的電話號碼格式" });
    }
    if (updateData.website !== undefined && updateData.website.trim() !== '' && !validator.isURL(updateData.website, { require_protocol: true })) {
        return res.status(400).json({ message: "無效的網站連結格式 (需要包含 http:// 或 https://)" });
    }


    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    const sql = `
        UPDATE vendors
        SET ${fields}
        WHERE vendor_id = ?
    `;

    // 這個路由不需要事務
    try {
        const [result] = await pool.query(sql, [...values, vendorIdInt]);

        if (result.affectedRows === 0) {
            // 檢查是否因為找不到 ID 導致沒有 affectedRows
            const [checkRows] = await pool.query('SELECT vendor_id FROM vendors WHERE vendor_id = ?', [vendorIdInt]);
            if (checkRows.length === 0) {
                return res.status(404).json({ message: '找不到指定的廠商。' });
            }
            // 如果找到了但沒有 affectedRows，說明更新的資料與現有資料相同
            console.warn(`[PUT /api/vendors/:vendor_id] 廠商 ID ${vendorIdInt} 資料無變更`);
            res.json({ message: '廠商資料無變更。' }); // 返回成功但資料無變更訊息
            return;
        }

        console.log(`[PUT /api/vendors/:vendor_id] 廠商 ID ${vendorIdInt} 資料更新成功`);
        res.json({ message: '廠商資料更新成功。' });
    } catch (err) {
        sendDbError(res, 'PUT /api/vendors/:vendor_id', err, "無法更新廠商資料");
    }
});

// DELETE /:vendor_id - 刪除特定 ID 的廠商
// 對應前端某個刪除廠商的功能 (假設掛載在 /api/vendors)
router.delete('/:vendor_id', async (req, res) => {
    const vendor_id = req.params.vendor_id;
    // 簡單驗證輸入
    if (!vendor_id || isNaN(parseInt(vendor_id)) || parseInt(vendor_id) <= 0) {
        return res.status(400).json({ message: '無效的廠商 ID。' });
    }
    const vendorIdInt = parseInt(vendor_id);


    // 這個路由不需要事務
    const sql = 'DELETE FROM vendors WHERE vendor_id = ?';

    try {
        const [result] = await pool.query(sql, [vendorIdInt]);

        if (result.affectedRows === 0) {
            console.warn(`[DELETE /api/vendors/:vendor_id] 找不到要刪除的廠商 ID: ${vendorIdInt}`);
            return res.status(404).json({ message: '找不到指定的廠商。' });
        }

        console.log(`[DELETE /api/vendors/:vendor_id] 廠商 ID ${vendorIdInt} 刪除成功`);
        res.json({ message: '廠商刪除成功。' });
    } catch (err) {
        // 如果存在外鍵約束導致無法刪除，錯誤碼通常是 ER_ROW_IS_REFERENCED_...
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            console.warn(`[DELETE /api/vendors/:vendor_id] 廠商 ID ${vendorIdInt} 刪除失敗：存在關聯記錄`);
            return res.status(409).json({ message: '此廠商存在關聯記錄，無法刪除。' }); // 409 Conflict
        }
        sendDbError(res, 'DELETE /api/vendors/:vendor_id', err, "無法刪除廠商");
    }
});


module.exports = router;