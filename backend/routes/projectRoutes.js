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

// GET / - 獲取所有專案列表
// 對應前端 ProjectAll.jsx (假設掛載在 /api/projects)
router.get('/', async (req, res) => {
  // 這個路由不需要事務，直接使用 pool.execute
  const query = `
    SELECT *
    FROM project_list_view
    ORDER BY wedding_date DESC
  `;

  try {
    const [results] = await pool.execute(query);
    res.json(results);
  } catch (err) {
    sendDbError(res, 'GET /api/projects', err, "無法獲取專案列表");
  }
});

// GET /:id - 獲取特定 ID 的專案詳情 (含情侶細節和偏好)
// 對應前端 ProjectDetailPage.jsx (假設掛載在 /api/projects)
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // 這個路由不需要事務，直接使用 pool.query
    const [rows] = await pool.query('SELECT * FROM project_details_view WHERE project_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '找不到此專案詳情' });
    }
    res.json(rows[0]); // 返回找到的單一專案詳情資料 (來自 View)
  } catch (err) {
    sendDbError(res, 'GET /api/projects/:id', err, "無法獲取單一專案詳情");
  }
});

// PUT /:id - 更新特定 ID 的專案詳情
// 對應前端 ProjectDetailPage.jsx 的 handleSave (假設掛載在 /api/projects)
// 此路由主要更新 project_couple_details 表格中的欄位 (可能有少量 wedding_projects 欄位)
router.put('/:id', async (req, res) => {
  const projectId = req.params.id;
  const updates = req.body; // 包含要更新的欄位和值

  // 定義允許從前端直接更新到 project_couple_details 表格的欄位
  const allowedCoupleDetailsUpdates = [
    'groom_name', 'bride_name', 'phone', 'email', 'wedding_place',
    'wedding_style', 'budget_id', 'remark', // remark 對應前端 note
    'horoscope', 'blood_type', 'favorite_color', 'favorite_season',
    'beliefs_description', 'needs_description'
  ];

  // 定義允許從前端直接更新到 wedding_projects 表格的欄位
  const allowedProjectUpdates = [
    // 'project_name', // 專案名稱通常由後端生成
    // 'customer_id',  // 主要客戶通常不在此更新
    'plan_id', 'wedding_date', 'wedding_time', 'project_status',
    // 'total_budget', // 總預算可能需要更複雜邏輯或不允許直接更新
    // 'google_sheet_link'
  ];


  const coupleDetailsUpdateData = {};
  const projectUpdateData = {};

  for (const key in updates) {
    if (allowedCoupleDetailsUpdates.includes(key)) {
      coupleDetailsUpdateData[key] = updates[key];
    } else if (allowedProjectUpdates.includes(key)) {
      projectUpdateData[key] = updates[key];
    }
  }

  const coupleUpdateKeys = Object.keys(coupleDetailsUpdateData);
  const projectUpdateKeys = Object.keys(projectUpdateData);

  if (coupleUpdateKeys.length === 0 && projectUpdateKeys.length === 0) {
    return res.status(400).json({ message: '沒有提供有效要更新的欄位' });
  }

  // --- 使用連接並執行事務 ---
  let connection; // 宣告 connection 變數在 try 塊外部
  try {
    connection = await pool.getConnection(); // 從連接池獲取連接
    await connection.beginTransaction(); // 開始事務

    // 更新 project_couple_details 表格
    if (coupleUpdateKeys.length > 0) {
      const coupleFields = coupleUpdateKeys.map(key => `${key} = ?`).join(', ');
      const coupleValues = Object.values(coupleDetailsUpdateData);
      const coupleSql = `UPDATE project_couple_details SET ${coupleFields} WHERE project_id = ?`;
      await connection.query(coupleSql, [...coupleValues, projectId]); // 使用 connection.query
    }

    // 更新 wedding_projects 表格 (如果需要且有提供更新數據)
    if (projectUpdateKeys.length > 0) {
      // wedding_projects 有 updated_at，使用 ON UPDATE CURRENT_TIMESTAMP 自動更新
      const projectFields = projectUpdateKeys.map(key => `${key} = ?`).join(', ');
      const projectValues = Object.values(projectUpdateData);
      const projectSql = `UPDATE wedding_projects SET ${projectFields} WHERE project_id = ?`;
      await connection.query(projectSql, [...projectValues, projectId]); // 使用 connection.query
    }

    await connection.commit(); // 提交事務

    // 如果更新成功且有需要，可以返回更新後的完整專案詳情（重新查詢 view）
    // 注意：這裡應該使用 pool.query 或在 connection.query 後再釋放連接
    // 簡單起見，直接在 commit 後用 pool 查詢 view
    const [updatedRows] = await pool.query('SELECT * FROM project_details_view WHERE project_id = ?', [projectId]);


    res.json({ message: '專案資料更新成功', project_id: projectId, updatedData: updatedRows[0] }); // 返回成功訊息及更新後資料

  } catch (err) {
    if (connection) { // 確保連接已獲取到
      await connection.rollback(); // 回滾事務
    }
    sendDbError(res, 'PUT /api/projects/:id', err, "更新專案資料失敗");
  } finally {
    if (connection) { // 確保連接已獲取到
      connection.release(); // 釋放連接回到連接池
    }
  }
});

// POST / - 新增專案 (需要同時新增到 wedding_projects 和 project_couple_details)
// 此路由實現會較複雜，需要同時處理兩個表格的插入，並使用事務確保原子性
router.post('/', async (req, res) => {
  // 接收前端發送的數據，例如：
  // {
  //   customer_id: 1, // 主要客戶ID (必填)
  //   plan_id: 1, // 套餐ID (必填)
  //   wedding_date: 'YYYY-MM-DD', // 婚禮日期 (必填)
  //   wedding_time: 'HH:mm:ss', // 婚禮時間
  //   project_status: '進行中', // 專案狀態
  //   total_budget: 0.00, // 預算
  //   google_sheet_link: '...',
  //   // ProjectCoupleDetails fields
  //   groom_name: '...', // 必填
  //   bride_name: '...', // 必填
  //   phone: '...', // VARCHAR
  //   email: '...',
  //   wedding_place: '...',
  //   wedding_style: '...', // VARCHAR
  //   budget_id: '...', // INT - 注意：這個 budget_id 在 project_couple_details 的 FK 尚未定義
  //   remark: '...', // 顧客需求細節 (TEXT)
  //   // ... 其他偏好欄位 (horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description)
  // }
  const {
    customer_id, plan_id, wedding_date, wedding_time, project_status, total_budget, google_sheet_link,
    // ProjectCoupleDetails fields
    groom_name, bride_name, phone, email, wedding_place, wedding_style, budget_id, remark,
    horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description
  } = req.body;

  // 基本驗證
  if (!customer_id || !plan_id || !wedding_date || !groom_name || !bride_name) {
    return res.status(400).json({ message: '客戶ID, 方案ID, 婚禮日期, 新郎姓名, 新娘姓名 是必填欄位' });
  }

  // 將陣列型別的偏好轉換為字串儲存 (如果前端發送的是陣列)
  const formattedHoroscope = Array.isArray(horoscope) ? horoscope.join('、') : horoscope;
  const formattedBloodType = Array.isArray(blood_type) ? blood_type.join('、') : blood_type;
  const formattedFavoriteSeason = Array.isArray(favorite_season) ? favorite_season.join('、') : favorite_season;


  let newProjectId = null;
  // --- 使用連接並執行事務 ---
  let connection; // 宣告 connection 變數在 try 塊外部
  try {
    connection = await pool.getConnection(); // 從連接池獲取連接
    await connection.beginTransaction(); // 開始事務

    // 1. 新增到 wedding_projects 表格
    // project_name 可以自動生成，例如結合新人姓名
    const projectName = `${groom_name} & ${bride_name} 的婚禮`;
    const [projectResult] = await connection.query( // 使用 connection.query
      `INSERT INTO wedding_projects (project_name, customer_id, plan_id, wedding_date, wedding_time, project_status, total_budget, google_sheet_link)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectName, customer_id, plan_id, wedding_date, wedding_time, project_status || '規劃中', total_budget || 0.00, google_sheet_link]
    );
    newProjectId = projectResult.insertId; // 獲取新插入的 project_id

    // 2. 新增到 project_couple_details 表格，使用上一步獲取的 newProjectId
    const [coupleDetailsResult] = await connection.query( // 使用 connection.query
      `INSERT INTO project_couple_details (project_id, groom_name, bride_name, phone, email, wedding_place, wedding_style, budget_id, remark, horoscope, blood_type, favorite_color, favorite_season, beliefs_description, needs_description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newProjectId,
        groom_name,
        bride_name,
        phone,
        email,
        wedding_place,
        wedding_style,
        budget_id, // 注意 budget_id 可能需要更複雜的關聯邏輯
        remark,
        formattedHoroscope,
        formattedBloodType,
        favorite_color,
        formattedFavoriteSeason,
        beliefs_description,
        needs_description
      ]
    );

    await connection.commit(); // 提交事務

    res.status(201).json({ message: '專案新增成功', project_id: newProjectId });

  } catch (err) {
    if (connection) { // 確保連接已獲取到
      await connection.rollback(); // 回滾事務
    }
    sendDbError(res, 'POST /api/projects', err, "新增專案失敗");
  } finally {
    if (connection) { // 確保連接已獲取到
      connection.release(); // 釋放連接回到連接池
    }
  }
});


// 你可能還需要其他與專案相關的路由，例如：
// GET /:id/tasks - 獲取特定專案的任務列表
// POST /:id/tasks - 為特定專案新增任務
// PUT /:id/tasks/:taskId - 更新特定專案的某個任務
// DELETE /:id/tasks/:taskId - 刪除特定專案的某個任務
// ... 預算項目、婚禮流程等相關路由


module.exports = router;