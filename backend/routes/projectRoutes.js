// projectRoutes.js (修正版)
const express = require('express');
const router = express.Router();
const pool = require('../db');

// 輔助函數：統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    res.status(500).json({
        message: `${message}: ${error.message}`,
        code: error.code || 'UNKNOWN_DB_ERROR'
    });
};

// GET /plan - 獲取所有套餐列表 (供 HomePages.jsx 使用)
// 完整路徑將是 /api/projects/plan (由 app.js 的 app.use('/api/projects', ...) 提供前綴)
router.get('/plan', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT plan_id, project_name, plan_description, price
            FROM wedding_plans
        `);
        res.json(rows);
    } catch (error) {
        // 使用 sendDbError 輔助函數
        sendDbError(res, 'GET /api/projects/plan', error, "取得婚禮專案套餐資料失敗");
    }
});


// GET / - 獲取所有專案列表 (完整路徑將是 /api/projects)
router.get('/', async (req, res) => {
    const query = `
        SELECT
            p.project_id,
            p.client_name,
            DATE_FORMAT(p.wedding_date, '%Y-%m-%d') AS wedding_date,
            p.plan_id,
            wp.project_name AS plan_name,
            p.project_status,
            DATE_FORMAT(p.project_build_time, '%Y-%m-%d') AS project_build_time
        FROM projects p
        LEFT JOIN wedding_plans wp ON p.plan_id = wp.plan_id
        ORDER BY p.project_build_time DESC
    `;

    try {
        const [results] = await pool.execute(query);
        res.json(results);
    } catch (err) {
        sendDbError(res, 'GET /api/projects', err, "無法獲取專案列表");
    }
});

// GET /:id - 獲取特定 ID 的專案詳情 (完整路徑將是 /api/projects/:id)
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [rows] = await pool.query('SELECT * FROM project_details WHERE project_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: '找不到此專案詳情' });
        }
        res.json(rows[0]);
    } catch (err) {
        sendDbError(res, 'GET /api/projects/:id', err, "無法獲取單一專案詳情");
    }
});

// PUT /:id - 更新特定 ID 的專案詳情 (完整路徑將是 /api/projects/:id)
router.put('/:id', async (req, res) => {
    const projectId = req.params.id;
    const updates = req.body;

    // 允許更新的欄位 (已移除 'customer_note')
    const allowedUpdates = [
        'groom_name', 'bride_name', 'client_name', 'phone_num',
        'wedding_date', 'wedding_place', 'budget_id', 'plan_id', 'wedding_style'
    ];

    const updateData = {};
    for (const key in updates) {
        if (allowedUpdates.includes(key)) {
            updateData[key] = updates[key];
        }
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: '沒有提供有效要更新的欄位' });
    }

    // 自動加入更新時間
    updateData.project_update_time = new Date();

    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    const sql = `UPDATE project_details SET ${fields} WHERE project_id = ?`;

    try {
        const [result] = await pool.query(sql, [...values, projectId]);

        if (result.affectedRows === 0) {
            console.warn(`[PUT /api/projects/${projectId}] 沒有影響任何行。資料可能相同或 ID 未找到。`);
            return res.status(404).json({ message: '專案 ID 不存在或資料未變動' });
        }

        res.json({ message: '專案資料更新成功', project_id: projectId });
    } catch (err) {
        sendDbError(res, 'PUT /api/projects/:id', err, "更新專案資料失敗");
    }
});


// POST /new - 新增專案路由 (同時寫入 projects 和 project_details 表)
// 完整路徑將是 /api/projects/new
router.post('/new', async (req, res) => {
    const {
        client_name,
        wedding_date,
        plan_id,
        groom_name,
        bride_name,
        phone_num,
        wedding_place,
        wedding_style
        // customer_note 已從這裡移除
    } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. 插入到 `projects` 主表
        const [projectResult] = await connection.query(
            `INSERT INTO projects
            (client_name, wedding_date, plan_id, project_status, project_build_time)
            VALUES (?, ?, ?, ?, NOW())`,
            [client_name, wedding_date, plan_id, '進行中']
        );
        const newProjectId = projectResult.insertId;

        // 2. 插入到 `project_details` 詳情表
        const [detailResult] = await connection.query(
            `INSERT INTO project_details
            (project_id, groom_name, bride_name, client_name, phone_num, wedding_date, wedding_place, plan_id, wedding_style, project_build_time, project_update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, // INSERT 語句已移除 customer_note 欄位
            [
                newProjectId,
                groom_name,
                bride_name,
                client_name,
                phone_num,
                wedding_date,
                wedding_place,
                plan_id,
                wedding_style
                // customer_note 已從這裡移除
            ]
        );

        await connection.commit();
        res.status(201).json({ message: '專案新增成功！', project_id: newProjectId });

    } catch (err) {
        await connection.rollback();
        console.error('❌ 新增專案錯誤:', err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
            res.status(400).json({ message: '無效的套餐ID (plan_id) 或其他關聯鍵錯誤，請檢查輸入。' });
        } else if (err.code === 'ER_DUP_ENTRY') {
             res.status(409).json({ message: '資料重複，可能此專案ID已存在。' });
        }
        else {
            res.status(500).json({ message: '伺服器錯誤，無法新增專案。' });
        }
    } finally {
        connection.release();
    }
});

module.exports = router;