const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保這個 pool 是 Promise-based 的 (mysql2/promise)
const validator = require('validator');
const moment = require('moment'); // 用於日期時間格式化和驗證
// --- 輔助函數 ---
// 統一處理資料庫錯誤響應
const sendDbError = (res, routeName, error, message = "伺服器內部錯誤") => {
    console.error(`[${routeName}] 資料庫操作錯誤:`, error);
    // 避免在生產環境暴露過多內部細節，但在開發時提供詳細錯誤信息有幫助
    const errorMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message}`;
    res.status(500).json({ message: errorMessage, code: error.code || 'UNKNOWN_DB_ERROR' });
};
// 映射新的 project_status 到舊的 status (open/closed)
const mapNewStatusToOld = (newStatus) => {
    switch (newStatus) {
        case '已完成':
        case '取消':
            return 'closed';
        default:
            // '規劃中', '進行中'
            return 'open';
    }
};
// 映射舊的 status (open/closed) 到新的 project_status
const mapOldStatusToNew = (oldStatus) => {
    switch (oldStatus) {
        case 'closed':
            return '已完成'; // 或者 '取消'，根據業務決定哪個更合適
        default:
            // 'open'
            return '進行中'; // 或者 '規劃中'
    }
};
// --- 路由定義 ---
// 獲取所有專案 (對應舊的獲取所有婚禮情侶)
router.get('/', async (req, res) => {
    try {
        // 從 wedding_projects 和 project_couple_details 連接查詢，並別名欄位以匹配前端舊結構
        const query = `
            SELECT wp.project_id AS id, 
                pcd.groom_name,
                pcd.bride_name,
                pcd.email,
                pcd.phone,
                wp.wedding_date,
                wp.wedding_time,
                pcd.wedding_place AS wedding_location,
                wp.google_sheet_link,
                CASE WHEN wp.project_status IN ('已完成', '取消') THEN 'closed' ELSE 'open' END AS status,
                wp.created_at, 
                wp.updated_at
            FROM wedding_projects wp
            JOIN project_couple_details pcd ON wp.project_id = pcd.project_id
            ORDER BY wp.wedding_date DESC -- 假設按婚期倒序
        `;
        const [results] = await pool.query(query);
        console.log(`[GET /] 成功獲取 ${results.length} 筆專案/客戶資料`);
        res.json(results);
    } catch (err) {
        sendDbError(res, 'GET /', err, "無法獲取所有客戶資料");
    }
});
// 新增專案 (對應舊的新增婚禮情侶)
router.post('/', async (req, res) => {
    // 從請求體中解構數據 (前端 ServicePage.jsx 發送的字段)
    const { groom_name, bride_name, email, phone, wedding_date, wedding_location, form_link } = req.body;
    // 1. 驗證輸入
    if (!groom_name || !bride_name || !email || !phone || !form_link) {
        console.warn("[POST /] 缺少必要欄位");
        return res.status(400).json({ message: "缺少必要欄位：新郎姓名、新娘姓名、Email、電話號碼 或 Google 試算表連結" });
    }
    if (!validator.isEmail(email)) {
        console.warn(`[POST /] Email 格式不正確: ${email}`);
        return res.status(400).json({ message: "Email 格式不正確" });
    }
    // 考慮國際電話號碼，可以放鬆 strictMode 或使用更複雜的驗證
    if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
        console.warn(`[POST /] 電話號碼格式不正確: ${phone}`);
        return res.status(400).json({ message: "電話號碼格式不正確" });
    }
    // 驗證 form_link 是否為有效的 URL，包含 http 或 https
    if (!validator.isURL(form_link, { require_protocol: true })) {
        console.warn(`[POST /] Google 試算表連結格式不正確: ${form_link}`);
        return res.status(400).json({ message: "Google 試算表連結格式不正確 (需包含 http:// 或 https://)" });
    }
    // 拆分 wedding_date (datetime-local 字串:YYYY-MM-DDTHH:mm)
    let datePart = null;
    let timePart = null;
    if (wedding_date) {
        const [dateStr, timeStr] = wedding_date.split('T');
        if (moment(dateStr, 'YYYY-MM-DD', true).isValid()) {
            datePart = dateStr;
        }
        // 驗證時間格式 HH:mm，並轉換為 HH:mm:ss
        if (timeStr && moment(timeStr, 'HH:mm', true).isValid()) {
            timePart = timeStr + ':00';
        } else if (timeStr) {
            console.warn(`[POST /] 無效的婚禮時間格式 (HH:mm): ${timeStr}`);
            return res.status(400).json({ message: "無效的婚禮時間格式 (應為 HH:mm)" });
        }
    }
    let connection; // 聲明連接變量以便在 finally 區塊釋放
    try {
        connection = await pool.getConnection(); // 從連接池獲取連接
        await connection.beginTransaction(); // 開始事務
        // *** 處理 customer_id：暫時使用默認 ID = 1 ***
        // 您需要根據業務需求修改這裡，例如從前端獲取或根據業務邏輯查找
        const defaultCustomerId = 1;
        // 可以在這裡檢查 defaultCustomerId 是否存在於 customers 表中，避免 FK 錯誤
        const [customerCheck] = await connection.query('SELECT customer_id FROM customers WHERE customer_id = ?', [defaultCustomerId]);
        if (customerCheck.length === 0) {
            console.error(`[POST /] 配置錯誤：默認 customer_id ${defaultCustomerId} 在 customers 表中不存在`);
            await connection.rollback(); // 回滾事務
            return res.status(500).json({ message: "伺服器配置錯誤：無法找到默認客戶" });
        }
        // 2. 插入 wedding_projects 表
        // project_name 可以由新人姓名組合或其他方式決定
        const projectName = `${groom_name} & ${bride_name} 的婚禮`;
        const projectQuery = `
            INSERT INTO wedding_projects (
                project_name,
                customer_id,
                wedding_date,
                wedding_time,
                google_sheet_link,
                project_status,
                total_budget
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const projectValues = [
            projectName,
            defaultCustomerId, // 使用默認 customer_id
            datePart, // 格式化後的日期部分
            timePart, // 格式化後的時間部分
            form_link || null, // 對應 google_sheet_link
            '規劃中', // 新增時通常是規劃中
            0.00 // total_budget 可以在後續編輯時更新
        ];
        const [projectResult] = await connection.query(projectQuery, projectValues);
        const newProjectId = projectResult.insertId; // 獲取新插入的 project_id
        // 3. 插入 project_couple_details 表
        const coupleDetailQuery = `
            INSERT INTO project_couple_details (
                project_id,
                groom_name,
                bride_name,
                email,
                phone,
                wedding_place -- 其他 project_couple_details 的新欄位如果在前端沒有對應，將使用資料庫默認值或 NULL
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        const coupleDetailValues = [
            newProjectId, // 使用剛插入的 project_id 作為 PK 和 FK
            groom_name,
            bride_name,
            email,
            phone,
            wedding_location || null // 對應 wedding_place
        ];
        await connection.query(coupleDetailQuery, coupleDetailValues);
        await connection.commit(); // 提交事務
        console.log(`[POST /] 成功新增專案/客戶，ID: ${newProjectId}`);
        res.status(201).json({
            id: newProjectId, // 返回新的 project_id 給前端
            message: "客戶新增成功"
        });
    } catch (err) {
        if (connection) await connection.rollback(); // 發生錯誤時回滾事務
        // 檢查是否為重複 Email 或 Google Sheet Link 錯誤
        if (err.code === 'ER_DUP_ENTRY') {
            // 根據實際的唯一索引名稱判斷是哪個字段重複
            let field = '資料'; // 默認值
            if (err.sqlMessage.includes('email')) field = 'Email';
            else if (err.sqlMessage.includes('google_sheet_link')) field = 'Google 試算表連結';
            // 可能還有 project_couple_details 的 phone 等字段的唯一約束
            else if (err.sqlMessage.includes('phone')) field = '電話號碼';
            console.warn(`[POST /] 新增專案失敗：${field} 已存在 (${err.sqlMessage})`);
            return res.status(409).json({ message: `${field} 已被使用，請輸入唯一值` });
        }
        sendDbError(res, 'POST /', err, "新增客戶失敗");
    } finally {
        if (connection) connection.release(); // 釋放連接
    }
});
// 更新專案狀態 (對應舊的更新客戶狀態 - 拖曳功能使用)
router.put('/:id/status', async (req, res) => {
    const projectId = parseInt(req.params.id); // 參數 id 現在是新的 project_id
    const { status: oldStatus } = req.body; // 從請求體中獲取舊的 status (open/closed)
    // 1. 驗證輸入
    if (isNaN(projectId)) {
        console.warn(`[PUT /:id/status] 無效的專案 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的專案 ID" });
    }
    if (!oldStatus || (oldStatus !== 'open' && oldStatus !== 'closed')) {
        console.warn(`[PUT /:id/status] 無效的狀態值: ${oldStatus}`);
        return res.status(400).json({ message: "無效的狀態值，狀態必須是 'open' 或 'closed'" });
    }
    // 2. 將舊狀態映射到新狀態
    const newProjectStatus = mapOldStatusToNew(oldStatus);
    try {
        // 3. 更新 wedding_projects 表的 project_status 欄位
        const query = 'UPDATE wedding_projects SET project_status = ? WHERE project_id = ?';
        const [results] = await pool.query(query, [newProjectStatus, projectId]);
        // 4. 檢查更新結果
        if (results.affectedRows === 0) {
            console.warn(`[PUT /:id/status] 找不到 ID 為 ${projectId} 的專案或狀態未改變`);
            // 可以進一步檢查是否僅僅是因為狀態相同而沒有更新
            const [checkStatus] = await pool.query('SELECT project_status FROM wedding_projects WHERE project_id = ?', [projectId]);
            if (checkStatus.length > 0 && checkStatus[0].project_status === newProjectStatus) {
                return res.status(200).json({ message: `專案狀態已是 '${newProjectStatus}'，無需更新。` });
            }
            return res.status(404).json({ message: `找不到 ID 為 ${projectId} 的專案。` });
        }
        console.log(`[PUT /:id/status] 專案 ID ${projectId} 狀態更新成功為 ${newProjectStatus}`);
        res.status(200).json({ message: "專案狀態更新成功" }); // 返回成功的消息
    } catch (err) {
        sendDbError(res, `PUT /${projectId}/status`, err, "無法更新專案狀態");
    }
});
// 獲取單個專案 (對應舊的獲取單個婚禮情侶) 的詳細資料
router.get("/:id", async (req, res) => {
    const projectId = parseInt(req.params.id); // 參數 id 現在是新的 project_id
    // 1. 驗證輸入
    if (isNaN(projectId)) {
        console.warn(`[GET /:id] 無效的專案 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的專案 ID" });
    }
    try {
        // 從 wedding_projects 和 project_couple_details 連接查詢
        const query = `
            SELECT wp.project_id AS id,
                pcd.groom_name,
                pcd.bride_name,
                pcd.email,
                pcd.phone,
                wp.wedding_date,
                wp.wedding_time,
                pcd.wedding_place AS wedding_location,
                wp.google_sheet_link,
                CASE WHEN wp.project_status IN ('已完成', '取消') THEN 'closed' ELSE 'open' END AS status,
                wp.created_at,
                wp.updated_at
            FROM wedding_projects wp
            JOIN project_couple_details pcd ON wp.project_id = pcd.project_id
            WHERE wp.project_id = ? -- 條件使用新的 project_id
        `;
        const [results] = await pool.query(query, [projectId]);
        if (results.length === 0) {
            console.warn(`[GET /:id] 找不到 ID 為 ${projectId} 的專案資料`);
            return res.status(404).json({ message: "找不到客戶資料" }); // 保持舊的錯誤信息，減少前端修改
        }
        console.log(`[GET /:id] 成功獲取專案 ID ${projectId} 的資料`);
        res.json(results[0]);
    } catch (err) {
        sendDbError(res, `GET /${projectId}`, err, "無法獲取客戶資料");
    }
});
// 更新單個專案 (對應舊的更新單個婚禮情侶)
router.put('/:id', async (req, res) => {
    const projectId = parseInt(req.params.id); // 參數 id 現在是新的 project_id
    // 從請求體中解構數據 (前端 CustomerDetail.jsx 發送的字段)
    const { groom_name, bride_name, email, phone, wedding_date, wedding_location, form_link } = req.body;
    // 1. 驗證輸入 (與 POST 類似，但可能需要調整非必填欄位檢查)
    if (isNaN(projectId)) {
        console.warn(`[PUT /:id] 無效的專案 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的專案 ID" });
    }
    if (!groom_name || !bride_name || !email || !phone || !form_link) {
        console.warn(`[PUT /:id] 缺少必要欄位 (專案 ID: ${projectId})`);
        return res.status(400).json({ message: "缺少必要欄位：新郎姓名、新娘姓名、Email、電話號碼 或 Google 試算表連結" });
    }
    if (!validator.isEmail(email)) {
        console.warn(`[PUT /:id] Email 格式不正確 (專案 ID: ${projectId}): ${email}`);
        return res.status(400).json({ message: "Email 格式不正確" });
    }
    if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
        console.warn(`[PUT /:id] 電話號碼格式不正確 (專案 ID: ${projectId}): ${phone}`);
        return res.status(400).json({ message: "電話號碼格式不正確" });
    }
    // 驗證 form_link 是否為有效的 URL，包含 http 或 https
    if (!validator.isURL(form_link, { require_protocol: true })) {
        console.warn(`[PUT /:id] Google 試算表連結格式不正確 (專案 ID: ${projectId}): ${form_link}`);
        return res.status(400).json({ message: "Google 試算表連結格式不正確 (需包含 http:// 或 https://)" });
    }
    // 拆分 wedding_date (datetime-local 字串)
    let datePart = null;
    let timePart = null;
    if (wedding_date) {
        const [dateStr, timeStr] = wedding_date.split('T');
        if (moment(dateStr, 'YYYY-MM-DD', true).isValid()) {
            datePart = dateStr;
        }
        // 驗證時間格式 HH:mm，並轉換為 HH:mm:ss
        if (timeStr && moment(timeStr, 'HH:mm', true).isValid()) {
            timePart = timeStr + ':00';
        } else if (timeStr) {
            console.warn(`[PUT /:id] 無效的婚禮時間格式 (HH:mm) (專案 ID: ${projectId}): ${timeStr}`);
            return res.status(400).json({ message: "無效的婚禮時間格式 (應為 HH:mm)" });
        }
    } else {
        // 如果前端傳來空字串或 null，則設定為 null 以清除資料庫值
        datePart = null;
        timePart = null;
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        // 2. 更新 wedding_projects 表
        // 只更新 wedding_projects 中對應前端編輯的欄位 (日期時間, 連結)
        const updateProjectQuery = `
            UPDATE wedding_projects
            SET wedding_date = ?,
                wedding_time = ?,
                google_sheet_link = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE project_id = ?
        `;
        const projectValues = [
            datePart, // 格式化後的日期部分
            timePart, // 格式化後的時間部分
            form_link || null, // 對應 google_sheet_link
            projectId
        ];
        const [projectResult] = await connection.query(updateProjectQuery, projectValues);
        // 3. 更新 project_couple_details 表
        // 只更新 project_couple_details 中對應前端編輯的欄位 (姓名, Email, 電話, 地點)
        const updateCoupleDetailQuery = `
            UPDATE project_couple_details
            SET groom_name = ?,
                bride_name = ?,
                email = ?,
                phone = ?,
                wedding_place = ? -- wedding_location 變為 wedding_place
            WHERE project_id = ?
        `;
        const coupleDetailValues = [
            groom_name,
            bride_name,
            email,
            phone,
            wedding_location || null, // 對應 wedding_place
            projectId
        ];
        const [coupleDetailResult] = await connection.query(updateCoupleDetailQuery, coupleDetailValues);
        // 檢查是否有任一表更新到數據（affectedRows > 0）
        if (projectResult.affectedRows === 0 && coupleDetailResult.affectedRows === 0) {
            console.warn(`[PUT /:id] 找不到 ID 為 ${projectId} 的專案或資料未改變`);
            // 可以進一步檢查數據是否完全相同，如果相同則返回成功
            const [checkData] = await connection.query(
                `SELECT wp.project_id, pcd.groom_name, pcd.bride_name, pcd.email, pcd.phone, wp.wedding_date, wp.wedding_time, pcd.wedding_place, wp.google_sheet_link
                FROM wedding_projects wp
                JOIN project_couple_details pcd ON wp.project_id = pcd.project_id
                WHERE wp.project_id = ?`,
                [projectId]
            );
            if (checkData.length > 0) {
                const dbData = checkData[0];
                // 進行嚴格比較（可能需要處理日期時間格式）
                const isSame = dbData.groom_name === groom_name &&
                    dbData.bride_name === bride_name &&
                    dbData.email === email &&
                    dbData.phone === phone &&
                    (dbData.wedding_date ? moment(dbData.wedding_date).format('YYYY-MM-DD') : null) === datePart &&
                    (dbData.wedding_time ? moment(dbData.wedding_time, 'HH:mm:ss').format('HH:mm') : null) === (timePart ? timePart.substring(0, 5) : null) && // 只比較 HH:mm
                    dbData.wedding_place === (wedding_location || null) && // 注意可能一個是 null 一個是空字串的問題
                    dbData.google_sheet_link === (form_link || null);
                if (isSame) {
                    await connection.commit(); // 即使沒有變動，也提交事務以釋放鎖
                    return res.status(200).json({ message: "客戶資料已是最新，無需更新。" });
                }
            }
            await connection.rollback(); // 找不到專案，回滾事務
            return res.status(404).json({ message: "找不到要更新的客戶資料。" });
        }
        await connection.commit();
        console.log(`[PUT /:id] 成功更新專案/客戶 ID ${projectId}`);
        res.status(200).json({ message: "客戶資料更新成功" });
    } catch (err) {
        if (connection) await connection.rollback();
        // 檢查是否為重複 Email 或 Google Sheet Link 錯誤
        if (err.code === 'ER_DUP_ENTRY') {
            let field = '資料';
            if (err.sqlMessage.includes('email')) field = 'Email';
            else if (err.sqlMessage.includes('google_sheet_link')) field = 'Google 試算表連結';
            else if (err.sqlMessage.includes('phone')) field = '電話號碼'; // 如果 phone 有唯一約束
            console.warn(`[PUT /:id] 更新專案失敗：${field} 已存在 (${err.sqlMessage})`);
            return res.status(409).json({ message: `${field} 已被使用，請輸入唯一值` });
        }
        sendDbError(res, `PUT /${projectId}`, err, "更新客戶資料失敗");
    } finally {
        if (connection) connection.release();
    }
});
// 查詢單個專案 (對應舊的獲取單個婚禮情侶) 的賓客資料 (從 guests 表)
// 注意：前端傳來的 ID 是 project_id
router.get("/:id/guests", async (req, res) => {
    const projectId = parseInt(req.params.id); // 參數 id 現在是 project_id
    // 1. 驗證輸入
    if (isNaN(projectId)) {
        console.warn(`[GET /:id/guests] 無效的專案 ID: ${req.params.id}`);
        return res.status(400).json({ message: "無效的專案 ID" });
    }
    try {
        // 從 guests 表中查詢數據，並將 guest_id 別名為 id 以匹配前端
        const query = `
            SELECT guest_id AS id, -- 將新的 guest_id 別名為舊的 id
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
            WHERE project_id = ? -- 條件使用新的 project_id
        `;
        const [results] = await pool.query(query, [projectId]);
        console.log(`[GET /:id/guests] 成功獲取專案 ID ${projectId} 的 ${results.length} 筆賓客資料`);
        // 成功獲取資料，返回賓客資料陣列 (即使為空陣列)
        res.json(results);
    } catch (err) {
        sendDbError(res, `GET /${projectId}/guests`, err, "無法獲取賓客資料");
    }
});

module.exports = router;