// backend/routes/projectRoutes.js (移除 form_link 從新增)
const express = require('express');
const router = express.Router();
const pool = require('../db'); // 確保 pool 是 Promise-based 的 (例如使用 mysql2/promise)
const moment = require('moment'); // 用於日期時間處理和驗證
const validator = require('validator'); // 用於驗證

// 輔助函數：統一處理資料庫錯誤響應
const sendError = (res, routeName, error, message = "伺服器內部錯誤", statusCode = 500) => {
  console.error(`[Backend ${routeName}] 錯誤:`, error);
  // 根據環境返回不同詳細程度的錯誤信息
  const errorMessage = process.env.NODE_ENV === 'production' ? message : `${message}: ${error.message}`;
  res.status(statusCode).json({
    success: false, // 在 success 欄位也標記失敗
    message: errorMessage,
    code: error.code || 'UNKNOWN_ERROR',
    // details: process.env.NODE_ENV !== 'production' ? error.stack : undefined // 開發環境提供堆疊追蹤
  });
};

// 輔助函數：處理空值或默認值
const getValueOrFallback = (value, fallbackText) => {
  // 檢查值是否存在、是否為字串且非空，否則返回 fallbackText
  // 同時處理從資料庫讀取的 null 值
  return (value != null && typeof value === 'string' && value.trim() !== '') ? value.trim() : fallbackText;
};

// 輔助函數：將舊的 project_status (open/closed) 映射到新的 ENUM
const mapOldStatusToNew = (oldStatus) => {
  switch (oldStatus) {
    case 'closed':
      return '已完成'; // 或者 '取消'，根據業務決定哪個更合適
    case 'open':
      return '進行中'; // 或者 '規劃中'
    default:
      return '規劃中'; // 默認值 (用於新增時沒有提供 status)
  }
};


// --- 路由定義 ---

// GET /plan - 獲取所有套餐列表 (供 HomePage.jsx 或其他頁面使用)
// 完整路徑將是 /api/projects/plan
router.get('/plan', async (req, res) => {
  try {
    // 修改查詢欄位名稱：project_name 改為 plan_name 以匹配新 Schema
    const [rows] = await pool.query(`
            SELECT plan_id, plan_name, plan_description, price
            FROM wedding_plans
        `);
    console.log(`[Backend GET /plan] 成功取得 ${rows.length} 筆套餐資料`);
    res.json(rows);
  } catch (error) {
    sendError(res, 'GET /plan', error, "取得婚禮專案套餐資料失敗");
  }
});


// GET / - 獲取所有專案列表 (完整路徑將是 /api/projects)
// 供 ServicePage.jsx (賀卡寄送列表), DesignProcess.jsx (AI流程列表) 使用
router.get('/', async (req, res) => {
  // 從 wedding_projects 和 project_couple_details JOIN 查詢
  // 並別名欄位以盡量匹配舊的 projects 表結構或前端期望的列表字段
  const query = `
        SELECT
            wp.project_id, -- 主鍵 ID
            pcd.groom_name, -- 情侶姓名 (新郎)
            pcd.bride_name, -- 情侶姓名 (新娘)
            -- 組合一個完整的客戶姓名（如果前端列表需要，ServicePage.jsx 用到了）
            CONCAT(pcd.groom_name, ' & ', pcd.bride_name) AS client_name, 
            pcd.email, -- 情侶 Email (用於 ServicePage.jsx 篩選)
            pcd.phone, -- 情侶電話 (用於 ServicePage.jsx 篩選)
            wp.wedding_date, -- 婚禮日期 (用於 ServicePage.jsx 篩選/顯示，DesignProcess.jsx 篩選/顯示)
            wp.plan_id, -- 套餐 ID
            wpn.plan_name, -- 套餐名稱 (JOIN wedding_plans)
            wp.project_status, -- 專案狀態 (用於 ServicePage.jsx 篩選/顯示)
            -- 映射新的 project_status 到舊的 status (open/closed) 以兼容前端
            CASE 
                WHEN wp.project_status IN ('已完成', '取消') THEN 'closed' 
                ELSE 'open' 
            END AS status,
            wp.created_at AS project_build_time, -- 建立時間
            wp.updated_at AS project_update_time -- 更新時間

        FROM wedding_projects wp
        JOIN project_couple_details pcd ON wp.project_id = pcd.project_id -- JOIN 情侶詳情表
        LEFT JOIN wedding_plans wpn ON wp.plan_id = wpn.plan_id -- LEFT JOIN 套餐表 (套餐可空)
        ORDER BY wp.created_at DESC -- 按建立時間倒序排列，或按 wedding_date 排序
    `;

  try {
    const [results] = await pool.query(query);
    console.log(`[Backend GET /] 成功取得 ${results.length} 筆專案列表資料`);
    res.json(results);
  } catch (err) {
    sendError(res, 'GET /', err, "無法獲取專案列表");
  }
});

// GET /:id - 獲取特定 ID 的專案詳情 (完整路徑將是 /api/projects/:id)
// 此接口應返回足夠 CustomerDetail.jsx 和 DesignProcessDetail.jsx 使用的數據
router.get('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id); // ID 是新的 project_id

  if (isNaN(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: '無效的專案 ID' });
  }

  try {
    // 從 wedding_projects 和 project_couple_details JOIN 查詢所有相關詳情
    const query = `
            SELECT
                wp.project_id,
                wp.project_name, -- 專案名稱
                wp.customer_id, -- 主要客戶 ID (連結到 Customers 表的客戶)
                wp.plan_id, -- 套餐 ID
                wpn.plan_name, -- 套餐名稱
                wp.wedding_date, -- 婚禮日期
                wp.wedding_time, -- 婚禮時間
                wp.project_status, -- 專案狀態
                wp.total_budget, -- 總預算
                wp.google_sheet_link, -- Google Sheet 連結
                wp.created_at AS project_build_time, -- 建立時間
                wp.updated_at AS project_update_time, -- 更新時間

                pcd.groom_name, -- 新郎姓名
                pcd.bride_name, -- 新娘姓名
                pcd.phone AS couple_phone, -- 情侶電話 (別名)
                pcd.email AS couple_email, -- 情侶 Email (別名)
                pcd.wedding_place, -- 婚禮地點
                pcd.wedding_style, -- 婚禮風格
                pcd.budget_id, -- 預算 ID (舊字段，保留)
                pcd.remark AS couple_remark, -- 情侶備註 (別名)
                pcd.horoscope, -- 星座
                pcd.blood_type, -- 血型
                pcd.favorite_color, -- 喜歡的顏色
                pcd.favorite_season, -- 喜歡的季節
                pcd.beliefs_description, -- 信仰/禁忌
                pcd.needs_description -- 其他需求

            FROM wedding_projects wp
            JOIN project_couple_details pcd ON wp.project_id = pcd.project_id -- JOIN 情侶詳情表
            LEFT JOIN wedding_plans wpn ON wp.plan_id = wpn.plan_id -- LEFT JOIN 套餐表 (套餐可空)
            WHERE wp.project_id = ?
        `;

    const [rows] = await pool.query(query, [projectId]);

    if (rows.length === 0) {
      console.warn(`[Backend GET /${projectId}] 找不到此專案`);
      return res.status(404).json({ success: false, message: '找不到此專案詳情' });
    }
    console.log(`[Backend GET /${projectId}] 成功獲取專案詳情`);
    res.json({ success: true, data: rows[0] }); // 返回成功標誌和數據

  } catch (err) {
    sendError(res, `GET /${projectId}`, err, "無法獲取單一專案詳情");
  }
});

// PUT /:id - 更新特定 ID 的專案詳情 (完整路徑將是 /api/projects/:id)
// 接收 CustomerDetail.jsx 或 DesignProcessDetail.jsx 發送的數據
router.put('/:id', async (req, res) => {
  const projectId = parseInt(req.params.id);
  // 從請求體獲取前端可能發送的所有更新字段
  const {
    groom_name, bride_name, email, phone, // project_couple_details 字段
    wedding_date, wedding_time, wedding_place, plan_id, // 分配到不同表
    form_link, // google_sheet_link (前端字段名是 form_link)
    wedding_style, budget_id, remark, horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description,
    // total_budget, project_status 等可能也從其他地方更新
    total_budget, project_status,
  } = req.body;

  if (isNaN(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: '無效的專案 ID' });
  }

  // 驗證和格式化日期時間 (從前端來可能是 YYYY-MM-DDTHH:mm 或 YYYY-MM-DD 字串)
  let formattedWeddingDate = null;
  let formattedWeddingTime = null;
  if (wedding_date) {
    const dateMoment = moment(wedding_date);
    if (dateMoment.isValid()) {
      formattedWeddingDate = dateMoment.format('YYYY-MM-DD');
      // 如果前端也傳了時間部分 (檢查格式 HH:mm)
      if (wedding_date.includes('T')) { // 包含 'T' 可能是 datetime-local 格式
        const timeStr = wedding_date.split('T')[1];
        const timeMoment = moment(timeStr, 'HH:mm', true);
        if (timeMoment.isValid()) {
          formattedWeddingTime = timeMoment.format('HH:mm:ss'); // 轉換為 HH:mm:ss 格式
        } else {
          console.warn(`[Backend PUT /${projectId}] 無效的婚禮時間格式 (HH:mm): ${timeStr}`);
          // 可以選擇返回錯誤或忽略無效時間
          // return res.status(400).json({ success: false, message: "無效的婚禮時間格式 (應為 HH:mm)" });
        }
      } else if (wedding_time && moment(wedding_time, 'HH:mm:ss').isValid()) { // 如果前端單獨傳了 wedding_time
        formattedWeddingTime = moment(wedding_time, 'HH:mm:ss').format('HH:mm:ss');
      }
    } else {
      console.warn(`[Backend PUT /${projectId}] 無效的婚禮日期格式: ${wedding_date}`);
      return res.status(400).json({ success: false, message: "無效的婚禮日期格式" });
    }
  } else if (wedding_date === '') { // 如果前端明確傳空字串表示清空
    formattedWeddingDate = null;
    formattedWeddingTime = null;
  } else if (wedding_date === null) { // 如果前端明確傳 null
    formattedWeddingDate = null;
    formattedWeddingTime = null;
  }


  // 驗證 Email, Phone, Google Sheet Link 如果它們存在且需要驗證
  if (email !== undefined && email !== null && email !== '') { // 確保只驗證非空值
    if (!validator.isEmail(email)) {
      console.warn(`[Backend PUT /${projectId}] 無效的 Email 格式: ${email}`);
      return res.status(400).json({ success: false, message: "無效的 Email 格式" });
    }
  }
  if (phone !== undefined && phone !== null && phone !== '') { // 確保只驗證非空值
    if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
      console.warn(`[Backend PUT /${projectId}] 無效的電話格式: ${phone}`);
      return res.status(400).json({ success: false, message: "無效的電話格式" });
    }
  }
  const googleSheetLink = form_link; // 前端字段名是 form_link
  if (googleSheetLink !== undefined && googleSheetLink !== null && googleSheetLink !== '') { // 確保只驗證非空值
    if (!validator.isURL(googleSheetLink, { require_protocol: true })) {
      console.warn(`[Backend PUT /${projectId}] 無效的 Google Sheet 連結格式: ${googleSheetLink}`);
      return res.status(400).json({ success: false, message: "無效的 Google Sheet 連結格式 (需包含 http:// 或 https://)" });
    }
  }


  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. 更新 wedding_projects 表
    // 僅更新屬於 wedding_projects 的欄位
    const projectUpdateFields = {};
    // 使用 === undefined 來判斷前端是否傳了這個字段
    if (wedding_date !== undefined) projectUpdateFields.wedding_date = formattedWeddingDate;
    if (wedding_time !== undefined || wedding_date !== undefined) projectUpdateFields.wedding_time = formattedWeddingTime;
    if (form_link !== undefined) projectUpdateFields.google_sheet_link = googleSheetLink || null; // form_link
    if (total_budget !== undefined) projectUpdateFields.total_budget = total_budget;
    if (project_status !== undefined) projectUpdateFields.project_status = project_status;


    const projectUpdateValues = Object.values(projectUpdateFields);
    const projectUpdateSql = Object.keys(projectUpdateFields).map(key => `${key} = ?`).join(', ');


    let projectResult = { affectedRows: 0 };
    if (projectUpdateSql) {
      const updateProjectQuery = `UPDATE wedding_projects SET ${projectUpdateSql}, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`;
      [projectResult] = await connection.query(updateProjectQuery, [...projectUpdateValues, projectId]);
    }


    // 2. 更新 project_couple_details 表
    // 僅更新屬於 project_couple_details 的欄位
    const coupleDetailUpdateFields = {};
    if (groom_name !== undefined) coupleDetailUpdateFields.groom_name = groom_name;
    if (bride_name !== undefined) coupleDetailUpdateFields.bride_name = bride_name;
    if (email !== undefined) coupleDetailUpdateFields.email = email;
    if (phone !== undefined) coupleDetailUpdateFields.phone = phone;
    if (wedding_place !== undefined) coupleDetailUpdateFields.wedding_place = wedding_place || null;

    // 添加其他情侶詳情和偏好字段的更新
    if (wedding_style !== undefined) coupleDetailUpdateFields.wedding_style = wedding_style;
    if (remark !== undefined) coupleDetailUpdateFields.remark = remark;
    if (horoscope !== undefined) coupleDetailUpdateFields.horoscope = horoscope;
    if (blood_type !== undefined) coupleDetailUpdateFields.blood_type = blood_type;
    if (favorite_color !== undefined) coupleDetailUpdateFields.favorite_color = favorite_color;
    if (favorite_season !== undefined) coupleDetailUpdateFields.favorite_season = favorite_season;
    if (beliefs_description !== undefined) coupleDetailUpdateFields.beliefs_description = beliefs_description;
    if (needs_description !== undefined) coupleDetailUpdateFields.needs_description = needs_description;
    if (budget_id !== undefined) coupleDetailUpdateFields.budget_id = budget_id;


    const coupleDetailUpdateValues = Object.values(coupleDetailUpdateFields);
    const coupleDetailUpdateSql = Object.keys(coupleDetailUpdateFields).map(key => `${key} = ?`).join(', ');

    let coupleDetailResult = { affectedRows: 0 };
    if (coupleDetailUpdateSql) {
      const updateCoupleDetailQuery = `UPDATE project_couple_details SET ${coupleDetailUpdateSql} WHERE project_id = ?`;
      [coupleDetailResult] = await connection.query(updateCoupleDetailQuery, [...coupleDetailUpdateValues, projectId]);
    }


    // 檢查是否有任一表更新到數據（affectedRows > 0）
    // 或者檢查專案 ID 是否存在以返回 404
    const [checkProject] = await connection.query('SELECT project_id FROM wedding_projects WHERE project_id = ?', [projectId]);
    if (checkProject.length === 0) {
      await connection.rollback(); // 回滾事務
      return res.status(404).json({ success: false, message: '找不到指定的專案' });
    }

    // 如果專案存在但沒有任何行的 affectedRows > 0，表示數據沒有變動
    if (projectResult.affectedRows === 0 && coupleDetailResult.affectedRows === 0) {
      await connection.commit(); // 提交事務
      console.log(`[Backend PUT /${projectId}] 專案 ID ${projectId} 資料可能沒有變動。`);
      // 返回成功並提示無變動
      return res.status(200).json({ success: true, message: '專案資料沒有變動，無需儲存。', project_id: projectId });
    }


    await connection.commit();

    console.log(`[Backend PUT /${projectId}] 成功更新專案 ID ${projectId}`);
    // 成功後，返回成功消息和 project_id
    res.json({ success: true, message: '專案資料更新成功', project_id: projectId });

  } catch (err) {
    await connection.rollback();
    // 檢查是否為重複 Email 或 Google Sheet Link 錯誤 (在 project_couple_details 或 wedding_projects)
    if (err.code === 'ER_DUP_ENTRY') {
      let field = '資料';
      if (err.sqlMessage.includes('email')) field = 'Email';
      else if (err.sqlMessage.includes('google_sheet_link')) field = 'Google 試算表連結';
      else if (err.sqlMessage.includes('phone')) field = '電話號碼'; // 如果 phone 有唯一約束

      console.warn(`[Backend PUT /${projectId}] 更新專案失敗：${field} 已存在 (${err.sqlMessage})`);
      return res.status(409).json({ success: false, message: `${field} 已被使用，請輸入唯一值` });
    }
    sendError(res, `PUT /${projectId}`, err, "更新專案資料失敗");
  } finally {
    if (connection) connection.release();
  }
});


// POST /new - 新增專案路由 (同時寫入 customers, wedding_projects 和 project_couple_details 表)
// 完整路徑將是 /api/projects/new
// 接收前端 ServicePage.jsx 或 DesignProcess.jsx 發送的數據
router.post('/new', async (req, res) => {
  // 從請求體中獲取前端可能發送的所有字段
  const {
    groom_name, bride_name, email, phone, // 情侶詳情 (同時用於創建或查找 Customers)
    wedding_date, wedding_time, wedding_place, plan_id, // 專案和詳情
    // form_link, // google_sheet_link (前端字段名是 form_link) - 現在非必要且不從此處輸入
    // 其他字段如 wedding_style, budget_id, remark, horoscope, blood_type, etc.
    wedding_style, budget_id, remark, horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description,
    // total_budget, project_status 等
    total_budget, project_status,
    // 注意：這裡不再需要從前端接收 customer_id，而是根據新人信息在後端處理
    // customer_id, 
  } = req.body;

  // 1. 驗證必要輸入 
  if (!groom_name || !bride_name || !email || !phone) {
    console.warn("[Backend POST /new] 缺少必要欄位 (姓名, Email, 電話)");
    // 錯誤訊息也需要更新
    return res.status(400).json({ success: false, message: "缺少必要欄位：新郎姓名、新娘姓名、Email 或 電話號碼" });
  }
  if (!validator.isEmail(email)) {
    console.warn(`[Backend POST /new] Email 格式不正確: ${email}`);
    return res.status(400).json({ success: false, message: "Email 格式不正確" });
  }
  if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
    console.warn(`[Backend POST /new] 電話號碼格式不正確: ${phone}`);
    return res.status(400).json({ success: false, message: "電話號碼格式不正確" });
  }
  // Google 表單連結現在是非必要且不從此處輸入，所以不再驗證其格式


  // 驗證和格式化日期時間 (前端可能發送 YYYY-MM-DDTHH:mm 格式字串)
  // 婚禮日期現在是非必要，只有在提供了非空值時才驗證和格式化
  let formattedWeddingDate = null;
  let formattedWeddingTime = null;
  if (wedding_date) { // 只有 wedding_date 非空才進行驗證和格式化
    const dateMoment = moment(wedding_date);
    if (dateMoment.isValid()) {
      formattedWeddingDate = dateMoment.format('YYYY-MM-DD');
      // 如果前端也傳了時間部分 (檢查格式 HH:mm)
      if (wedding_date.includes('T')) { // 包含 'T' 可能是 datetime-local 格式
        const timeStr = wedding_date.split('T')[1];
        const timeMoment = moment(timeStr, 'HH:mm', true);
        if (timeMoment.isValid()) {
          formattedWeddingTime = timeMoment.format('HH:mm:ss'); // 轉換為 HH:mm:ss 格式
        } else {
          console.warn(`[Backend POST /new] 無效的婚禮時間格式 (HH:mm): ${timeStr}`);
          // 即使日期有效，時間無效也視為錯誤
          return res.status(400).json({ success: false, message: "無效的婚禮時間格式 (應為 HH:mm)" });
        }
      } else if (wedding_time && moment(wedding_time, 'HH:mm:ss').isValid()) { // 如果前端單獨傳了 wedding_time
        formattedWeddingTime = moment(wedding_time, 'HH:mm:ss').format('HH:mm:ss');
      }
      // 如果 wedding_date 有值，但沒有時間部分，且也沒有單獨的 wedding_time，formattedWeddingTime 保持 null
    } else {
      console.warn(`[Backend POST /new] 無效的婚禮日期格式: ${wedding_date}`);
      return res.status(400).json({ success: false, message: "無效的婚禮日期格式" });
    }
  }
  // 如果 wedding_date 為空字串或 null，則 formattedWeddingDate 和 formattedWeddingTime 保持 null


  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // === 新增邏輯：處理 customers 表 ===
    let finalCustomerId;
    // 嘗試根據 Email 查找現有客戶
    const [existingCustomers] = await connection.query(
      'SELECT customer_id FROM customers WHERE email = ?',
      [email]
    );

    if (existingCustomers.length > 0) {
      // 如果找到現有客戶，使用其 ID
      finalCustomerId = existingCustomers[0].customer_id;
      console.log(`[Backend POST /new] 使用現有客戶 ID: ${finalCustomerId} (Email: ${email})`);
      // 可選：在這裡更新現有客戶的姓名或電話，如果前端傳來了且不為空
      if (groom_name && bride_name) { // 檢查是否有新人姓名
        const customerName = `${groom_name} & ${bride_name}`;
        // 只更新非空的字段
        const updateFields = {};
        if (customerName.trim() !== ' & ') updateFields.name = customerName; // 避免設置為 " & "
        if (phone) updateFields.phone = phone;

        if (Object.keys(updateFields).length > 0) {
          const updateSql = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
          const updateValues = Object.values(updateFields);
          await connection.query(
            `UPDATE customers SET ${updateSql} WHERE customer_id = ?`,
            [...updateValues, finalCustomerId]
          );
          console.log(`[Backend POST /new] 更新現有客戶 ID: ${finalCustomerId} 的資料`);
        }


      } else if (phone) { // 如果只有電話
        await connection.query(
          'UPDATE customers SET phone = ? WHERE customer_id = ?',
          [phone || null, finalCustomerId] // 電話可選更新
        );
        console.log(`[Backend POST /new] 更新現有客戶 ID: ${finalCustomerId} 的電話`);
      }


    } else {
      // 如果找不到現有客戶，創建一個新客戶記錄
      const customerName = `${groom_name} & ${bride_name}`; // 使用新人姓名組合作為客戶名稱
      const [newCustomerResult] = await connection.query(
        'INSERT INTO customers (name, phone, email, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [customerName, phone || null, email] // 電話欄位也設為可空
      );
      finalCustomerId = newCustomerResult.insertId; // 獲取新創建客戶的 ID
      console.log(`[Backend POST /new] 創建新客戶，ID: ${finalCustomerId}`);
    }
    // ===================================


    // 1. 插入到 `wedding_projects` 主表
    const projectName = `${getValueOrFallback(groom_name, '未提供新郎')} & ${getValueOrFallback(bride_name, '未提供新娘')} 的婚禮`; // 可以組合專案名稱
    const projectQuery = `
            INSERT INTO wedding_projects
            (project_name, customer_id, plan_id, wedding_date, wedding_time, project_status, total_budget, google_sheet_link, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) -- google_sheet_link 在此處插入為 NULL 或默認值
        `;
    const projectValues = [
      projectName,
      finalCustomerId, // *** 使用找到的或新創建的 customer_id ***
      plan_id || null, // plan_id 可空
      formattedWeddingDate, // 格式化後的日期 (現在可為 null)
      formattedWeddingTime, // 格式化後的時間 (現在可為 null)
      project_status || '規劃中', // 預設狀態
      total_budget || 0.00, // 預設預算
      null, // *** google_sheet_link 在新增時設為 NULL ***
    ];
    const [projectResult] = await connection.query(projectQuery, projectValues);
    const newProjectId = projectResult.insertId; // 獲取新生成的 project_id

    // 2. 插入到 `project_couple_details` 詳情表
    const detailQuery = `
            INSERT INTO project_couple_details
            (project_id, groom_name, bride_name, phone, email, wedding_place, wedding_style, budget_id, remark, horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    const detailValues = [
      newProjectId, // 使用剛插入的 project_id
      groom_name,
      bride_name,
      phone || null, // phone 也設為可空
      email,
      wedding_place || null, // wedding_place 也設為可空
      wedding_style || null, // wedding_style 也設為可空
      budget_id || null, // budget_id (舊字段，保留) 也設為可空
      remark || null, // remark 也設為可空
      horoscope || null, // horoscope 也設為可空
      blood_type || null, // blood_type 也設為可空
      favorite_color || null, // favorite_color 也設為可空
      favorite_season || null, // favorite_season 也設為可空
      beliefs_description || null, // beliefs_description 也設為可空
      needs_description || null // needs_description 也設為可空
    ];
    await connection.query(detailQuery, detailValues); // 不需要返回結果

    await connection.commit();
    console.log(`[Backend POST /new] 成功新增專案，ID: ${newProjectId}`);
    res.status(201).json({ success: true, message: '專案新增成功！', project_id: newProjectId });

  } catch (err) {
    await connection.rollback();
    console.error('❌ [Backend POST /new] 新增專案錯誤:', err);
    // 檢查 FK 錯誤 (plan_id 不存在)
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
      const fkField = err.sqlMessage.includes('plan_id') ? '套餐' : '關聯鍵';
      // customer_id FK 錯誤在這裡處理了，會先創建客戶
      return res.status(400).json({ success: false, message: `無效的${fkField} ID，請檢查輸入。` });
    }
    // 檢查唯一約束錯誤 (例如 email 或 google_sheet_link 在 project_couple_details，或 email/phone 在 customers)
    else if (err.code === 'ER_DUP_ENTRY') {
      let field = '資料';
      if (err.sqlMessage.includes('project_couple_details.email')) field = '情侶 Email'; // 檢查 project_couple_details 的唯一約束
      else if (err.sqlMessage.includes('project_couple_details.phone')) field = '情侶電話號碼'; // 檢查 project_couple_details 的唯一約束
      else if (err.sqlMessage.includes('google_sheet_link')) field = 'Google 試算表連結';
      // 檢查 customers 表的唯一約束（如果 Email 或 Phone 在 customers 表有唯一約束）
      else if (err.sqlMessage.includes('customers.email')) field = '客戶 Email';
      else if (err.sqlMessage.includes('customers.phone')) field = '客戶電話號碼';
      else if (err.sqlMessage.includes('ai_wedding_processes.project_id')) field = 'AI流程資料'; // 如果重復插入AI流程

      console.warn(`[Backend POST /new] 新增專案失敗：${field} 已存在 (${err.sqlMessage})`);
      return res.status(409).json({ success: false, message: `${field} 已被使用，請輸入唯一值` });
    }
    else {
      sendError(res, 'POST /new', err, '伺服器錯誤，無法新增專案。');
    }
  } finally {
    if (connection) connection.release();
  }
});

// GET /tasks - 獲取任務列表（含月份篩選）
// 完整路徑將是 /api/projects/tasks
router.get('/:projectId/tasks', async (req, res) => {
  const { projectId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT
         task_id,
         project_id,
         task_name,
         task_content,
         responsible_staff,
         expected_start,
         expected_end,
         actual_start,
         actual_end,
         task_status,
         priority,
         remark,
         created_at,
         updated_at
       FROM project_tasks
       WHERE project_id = ?
       ORDER BY FIELD(task_status, '延遲', '進行中', '尚未開始', '已完成'), expected_end ASC, task_id ASC`, // 排序：延遲 > 進行中 > 尚未開始 > 已完成, 再按預計結束日和ID
      [projectId]
    );

    console.log(`[Backend GET /projects/${projectId}/tasks] 成功抓取 ${rows.length} 筆任務資料`);
    res.json({ success: true, data: rows });
  } catch (err) {
    sendError(res, `GET /projects/${projectId}/tasks`, err, "無法獲取專案任務資料");
  }
});

// 4. 新增一個任務 (用於預設任務首次完成時)
router.post('/tasks', async (req, res) => {
  const {
    project_id,
    task_name,
    task_description,
    scheduled_start,
    scheduled_end,
    actual_start,
    actual_end,
    task_status,
    priority,
    remark
  } = req.body;

  if (!project_id || !task_name || !task_status) {
    return res.status(400).json({ success: false, message: "專案ID、任務名稱和任務狀態為必填項。" });
  }

  try {
    const [projectCheck] = await pool.query('SELECT project_id FROM wedding_projects WHERE project_id = ?', [project_id]);
    if (projectCheck.length === 0) {
      return res.status(404).json({ success: false, message: "找不到指定的專案ID。" });
    }

    const [result] = await pool.query(
      `INSERT INTO project_tasks (
         project_id, task_name, task_description, scheduled_start, scheduled_end,
         actual_start, actual_end, task_status, priority, remark
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        task_name,
        task_description || null,
        scheduled_start ? moment(scheduled_start).format('YYYY-MM-DD HH:mm:ss') : null,
        scheduled_end ? moment(scheduled_end).format('YYYY-MM-DD HH:mm:ss') : null,
        actual_start ? moment(actual_start).format('YYYY-MM-DD HH:mm:ss') : null,
        actual_end ? moment(actual_end).format('YYYY-MM-DD HH:mm:ss') : null,
        task_status,
        priority || '中',
        remark || null
      ]
    );
    console.log(`[Backend POST /tasks] 新增任務成功，ID: ${result.insertId}`);
    res.status(201).json({
      success: true,
      message: "任務新增成功",
      task_id: result.insertId
    });
  } catch (err) {
    sendError(res, `POST /tasks`, err, "無法新增任務");
  }
});


// 5. 更新專案主要資訊 (例如 couple_remark)
router.put('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { couple_remark } = req.body;

  try {
    // 首先更新 wedding_projects 表 (project_status 可以由其他邏輯控制，這裡只處理 couple_remark)
    const [projectUpdateResult] = await pool.query(
      `UPDATE wedding_projects SET project_status = ? WHERE project_id = ?`,
      ['進行中', id] // 例如，一旦編輯就設為進行中
    );

    // 然後更新 project_couple_details 表
    const [coupleDetailsUpdateResult] = await pool.query(
      `UPDATE project_couple_details SET remark = ? WHERE project_id = ?`,
      [couple_remark || null, id]
    );

    if (projectUpdateResult.affectedRows === 0 && coupleDetailsUpdateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "找不到指定的專案或沒有內容被改變。" });
    }

    console.log(`[Backend PUT /projects/${id}] 專案資訊更新成功`);
    res.json({ success: true, message: "專案資訊更新成功" });
  } catch (err) {
    sendError(res, `PUT /projects/${id}`, err, "無法更新專案資訊");
  }
});


// 6. 更新特定任務的狀態（通用更新任務屬性）
router.put('/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const {
    task_name,
    task_description,
    scheduled_start,
    scheduled_end,
    actual_start,
    actual_end,
    task_status,
    priority,
    remark
  } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (task_name !== undefined) { updateFields.push('task_name = ?'); updateValues.push(task_name); }
    if (task_description !== undefined) { updateFields.push('task_description = ?'); updateValues.push(task_description); }
    if (scheduled_start !== undefined) { updateFields.push('scheduled_start = ?'); updateValues.push(scheduled_start ? moment(scheduled_start).format('YYYY-MM-DD HH:mm:ss') : null); }
    if (scheduled_end !== undefined) { updateFields.push('scheduled_end = ?'); updateValues.push(scheduled_end ? moment(scheduled_end).format('YYYY-MM-DD HH:mm:ss') : null); }
    if (actual_start !== undefined) { updateFields.push('actual_start = ?'); updateValues.push(actual_start ? moment(actual_start).format('YYYY-MM-DD HH:mm:ss') : null); }
    if (actual_end !== undefined) { updateFields.push('actual_end = ?'); updateValues.push(actual_end ? moment(actual_end).format('YYYY-MM-DD HH:mm:ss') : null); }
    if (task_status !== undefined) { updateFields.push('task_status = ?'); updateValues.push(task_status); }
    if (priority !== undefined) { updateFields.push('priority = ?'); updateValues.push(priority); }
    if (remark !== undefined) { updateFields.push('remark = ?'); updateValues.push(remark); }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "沒有提供要更新的欄位。" });
    }

    const query = `UPDATE project_tasks SET ${updateFields.join(', ')} WHERE task_id = ?`;
    const [result] = await pool.query(query, [...updateValues, taskId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "找不到指定的任務或沒有內容被改變。" });
    }

    console.log(`[Backend PUT /tasks/${taskId}] 任務更新成功`);
    res.json({ success: true, message: "任務更新成功" });
  } catch (err) {
    sendError(res, `PUT /tasks/${taskId}`, err, "無法更新任務");
  }
});


// 7. 刪除特定任務
router.delete('/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM project_tasks WHERE task_id = ?', [taskId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "找不到指定的任務。" });
    }
    console.log(`[Backend DELETE /tasks/${taskId}] 任務刪除成功`);
    res.json({ success: true, message: "任務刪除成功" });
  } catch (err) {
    sendError(res, `DELETE /tasks/${taskId}`, err, "無法刪除任務");
  }
});


module.exports = router;