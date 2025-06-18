const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保 db.js 導出 Promise-based 連接池
const validator = require('validator'); // 用於驗證輸入
const moment = require('moment'); // 用於日期格式化和驗證

// 輔助函數：統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    res.status(500).json({
        message: `${message}: ${error.message}`,
        code: error.code || 'UNKNOWN_DB_ERROR'
    });
};

// 注意：這個路由檔案似乎是針對一個獨立的、使用中文欄位名稱的 'customer' 表，
// 這與提供的 Schema 中的 'customers' 表 (用於主要客戶/計費) 不同。
// 這裡將保留現有對這個 'customer' 表的操作，但請注意其與主 Schema 的潛在不一致。

// 1. 登入功能 - 操作 'customer' 表 (假設存在並有中文欄位)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // 基本輸入驗證
    if (!email || !password) {
        return res.status(400).json({ success: false, message: '請提供電子信箱和密碼。' });
    }

    try {
        // 使用中文欄位名稱查詢假設的 'customer' 表
        const [rows] = await pool.query(
            'SELECT `顧客id`, `顧客姓名`, `電子信箱`, `密碼` FROM `customer` WHERE `電子信箱` = ?',
            [email]
        );

        if (rows.length > 0) {
            const user = rows[0];
            // 驗證密碼 (如果密碼是明碼儲存，這是非常不安全的！建議使用 bcrypt 等庫進行密碼加密)
            if (user['密碼'] === password) {
                // 返回不包含密碼的用戶資訊
                res.json({
                    success: true,
                    message: '登入成功',
                    user: {
                        id: user['顧客id'],
                        name: user['顧客姓名'],
                        email: user['電子信箱'],
                    },
                });
            } else {
                res.status(401).json({ success: false, message: '帳號或密碼錯誤' }); // 密碼不匹配
            }
        } else {
            res.status(401).json({ success: false, message: '帳號或密碼錯誤' }); // 找不到用戶
        }

    } catch (err) {
        sendDbError(res, 'POST /login', err, '伺服器錯誤');
    }
});

// 2. 註冊功能 - 操作 'customer' 表 (假設存在並有中文欄位)
router.post('/register', async (req, res) => {
    console.log("收到前端註冊資料：", req.body);
    const {
        顧客姓名,
        電話,
        電子信箱,
        喜好風格,
        生日,
        建檔時間, // 前端提供建檔時間？通常由後端生成
        密碼
    } = req.body;

    // 1. 輸入驗證
    if (!顧客姓名 || !電話 || !電子信箱 || !密碼) {
        return res.status(400).json({ success: false, message: "請填寫所有必填欄位" });
    }
    if (!validator.isEmail(電子信箱)) {
        return res.status(400).json({ success: false, message: "請輸入有效的電子信箱" });
    }
    if (!validator.isMobilePhone(電話, 'any', { strictMode: false })) {
        return res.status(400).json({ success: false, message: "請輸入有效的電話號碼" });
    }
    // 生日格式驗證 (如果提供了生日)
    if (生日 && !moment(生日, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ success: false, message: "無效的生日日期格式 (應為 YYYY-MM-DD)" });
    }


    try {
        // 2. 檢查是否已有相同的信箱註冊過
        // 使用中文欄位名稱查詢假設的 'customer' 表
        const [existing] = await pool.query(
            'SELECT `顧客id` FROM `customer` WHERE `電子信箱` = ?',
            [電子信箱]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: '此信箱已註冊過' }); // 409 Conflict
        }

        // 3. 寫入資料到假設的 'customer' 表
        // 建檔時間由後端生成更可靠
        const registrationTime = moment().format('YYYY-MM-DD HH:mm:ss'); // 後端生成當前時間

        const query = `
            INSERT INTO \`customer\`
            (\`顧客姓名\`, \`電話\`, \`電子信箱\`, \`喜好風格\`, \`生日\`, \`建檔時間\`, \`密碼\`)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            顧客姓名,
            電話,
            電子信箱,
            喜好風格 || null, // 喜好風格可能可選
            生日 || null, // 生日可能可選
            registrationTime, // 使用後端生成的建檔時間
            密碼 // 注意：明碼儲存密碼非常不安全！強烈建議使用 bcrypt 等庫進行加密
        ];

        const [result] = await pool.query(query, values);

        console.log(`[POST /register] 成功註冊新用戶，ID: ${result.insertId}`);
        res.status(201).json({ success: true, message: '註冊成功' }); // 201 Created

    } catch (err) {
        sendDbError(res, 'POST /register', err, '伺服器錯誤，無法註冊');
    }
});

// 取得個人資料 - 操作 'customer' 表 (假設存在並有中文欄位)
// 這個路由名稱 `/api/profile` 看起來不對，應該是相對於掛載路徑的 `/profile`
// 假設它掛載在某個基礎路徑下，這裡就只處理後面的部分
router.get("/profile", async (req, res) => { // 路徑改為 /profile
    const { email } = req.query;

    // 1. 輸入驗證
    if (!email) {
        return res.status(400).json({ success: false, message: "請提供電子信箱參數" });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: "無效的電子信箱格式" });
    }


    try {
        // 使用中文欄位名稱查詢假設的 'customer' 表
        const [rows] = await pool.query(
            `SELECT \`顧客姓名\`, \`電話\`, \`電子信箱\`, \`喜好風格\`,
            DATE_FORMAT(\`生日\`, '%Y-%m-%d') AS 生日,
            DATE_FORMAT(\`建檔時間\`, '%Y-%m-%d') AS 建檔時間
    FROM \`customer\`
    WHERE \`電子信箱\` = ?`,
            [email]
        );

        if (rows.length > 0) {
            console.log(`[GET /profile] 成功獲取用戶 ${email} 的資料`);
            res.json({ success: true, data: rows[0] }); // 返回單個對象
        } else {
            console.warn(`[GET /profile] 找不到電子信箱為 ${email} 的用戶資料`);
            res.status(404).json({ success: false, message: "找不到使用者資料" });
        }
    } catch (err) {
        sendDbError(res, 'GET /profile', err, '伺服器錯誤');
    }
});

// 查詢單個婚禮專案的賓客資料 - 操作 'guests' 表
// 注意：前端原來的路由可能是 `/customers/:id/guests`，這裡改為 `/projects/:id/guests` 更合理
// 參數名稱也改為 projectId
router.get("/projects/:projectId/guests", async (req, res) => { // 路徑改為 /projects/:projectId/guests
    const projectId = parseInt(req.params.projectId); // 確保是整數

    // 1. 驗證輸入
    if (isNaN(projectId) || projectId <= 0) {
        console.warn(`[GET /projects/:projectId/guests] 無效的專案 ID: ${req.params.projectId}`);
        return res.status(400).json({ message: "無效的專案 ID" });
    }

    try {
        // 從 guests 表中查詢數據，使用 project_id 作為過濾條件
        const [results] = await pool.query(
            `SELECT
                guest_id AS id, -- 返回前端期望的 id
                google_sheet_guest_id,
                guest_name,
                email,
                is_sent,
                relationshipWithGroom,
                relationshipWithBride,
                relationshipWithCouple,
                guestDescription,
                sharedMemories,
                message
            FROM guests
             WHERE project_id = ?`, // 使用 project_id 過濾
            [projectId]
        );
        console.log(`[GET /projects/:projectId/guests] 成功獲取專案 ID ${projectId} 的 ${results.length} 筆賓客資料`);
        // 成功獲取資料，返回賓客資料陣列 (即使為空陣列)
        res.json(results);
    } catch (err) {
        sendDbError(res, `GET /projects/${projectId}/guests`, err, "無法獲取賓客資料");
    }
});

// 注意：這個路由檔案看起來揉合了用戶認證和部分專案/賓客功能。
// 建議將用戶認證相關路由 (login, register, profile) 放到 authRoutes.js 之類的檔案中，
// 將專案/賓客相關的查詢放到 projectRoutes.js 中，以保持職責分離。

module.exports = router;