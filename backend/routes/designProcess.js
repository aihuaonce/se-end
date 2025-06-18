const express = require('express');
const router = express.Router();
const db = require('../db'); // 假設您的資料庫連線設定在 db.js (Promise-based)
// 假設 aiService.js 存在並導出 callGeminiAI 函式
const { callGeminiAI } = require('./aiService');
const fs = require('fs');
const path = require('path');
const moment = require('moment'); // 用於日期時間格式化

// 讀取範例模板 (這部分不變)
const weddingProcessPath = path.join(__dirname, '../../src/data/weddingProcess.json');
let weddingProcessJson = '[]'; // 默認值
try {
  // 檢查文件是否存在，避免啟動時因文件不存在而報錯
  if (fs.existsSync(weddingProcessPath)) {
    weddingProcessJson = fs.readFileSync(weddingProcessPath, 'utf8');
    // 可選：驗證讀取到的 JSON 格式是否正確
    try {
      JSON.parse(weddingProcessJson);
    } catch (e) {
      console.error("weddingProcess.json 格式不正確，使用默認空 JSON:", e);
      weddingProcessJson = '[]';
    }
  } else {
    console.warn("找不到 weddingProcess.json 模板文件，使用默認空 JSON。");
  }

} catch (e) {
  console.error("讀取 weddingProcess.json 模板時發生錯誤:", e);
  weddingProcessJson = '[]';
}


// 輔助函數：處理空值或默認值
const getValueOrFallback = (value, fallbackText) => {
  // 檢查值是否存在、是否為字串且非空，否則返回 fallbackText
  // 同時處理從資料庫讀取的 null 值
  return (value != null && typeof value === 'string' && value.trim() !== '') ? value.trim() : fallbackText;
};

// 統一處理錯誤響應
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


// [GET] /api/design-process/:projectId - 讀取已儲存的流程
// 參數 coupleId 應對應新的 project_id
router.get('/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId); // 確保參數是整數

  if (isNaN(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: "無效的專案 ID。" });
  }

  try {
    // 修改查詢表格名稱和欄位
    const [rows] = await db.query(
      'SELECT process_json FROM ai_wedding_processes WHERE project_id = ?', // wedding_couple_id 改為 project_id
      [projectId]
    );

    if (rows.length > 0 && rows[0].process_json) {
      // 找到流程，將儲存的 JSON 字串直接回傳，讓前端的 universalParser 處理
      console.log(`[Backend GET /${projectId}] 成功讀取已儲存流程`);
      res.json({ success: true, data: rows[0].process_json }); // 直接返回字串

    } else {
      // 找不到流程 或 process_json 為空
      console.log(`[Backend GET /${projectId}] 找不到已儲存流程或流程為空。`);
      res.status(404).json({ success: false, message: '尚未生成或儲存任何流程。' });
    }
  } catch (error) {
    sendError(res, `GET /${projectId}`, error, '讀取已存流程失敗。');
  }
});

// [PUT] /api/design-process/:projectId - 更新/儲存手動編輯的流程
// 參數 coupleId 應對應新的 project_id
router.put('/:projectId', async (req, res) => {
  const projectId = parseInt(req.params.projectId); // 確保參數是整數
  const { processData } = req.body; // 前端會傳來編輯後的流程陣列

  if (isNaN(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: "無效的專案 ID。" });
  }

  if (!processData || !Array.isArray(processData)) {
    return res.status(400).json({ success: false, message: '缺少或無效的流程資料 (processData)。' });
  }

  // 可選：簡單驗證 processData 陣列中的每個物件格式，避免儲存明顯錯誤的數據
  const isValidFormat = processData.every(item =>
    typeof item === 'object' && item !== null &&
    '時間' in item && '事件' in item && '備註' in item
  );
  if (!isValidFormat) {
    console.warn(`[Backend PUT /${projectId}] 收到的 processData 格式不符預期`);
    // 可以選擇返回 400 錯誤，或者只儲存格式正確的部分，或者嘗試修正，這裡選擇返回錯誤
    return res.status(400).json({ success: false, message: '流程數據格式不正確，請檢查每個項目是否包含「時間」、「事件」、「備註」欄位。' });
  }


  try {
    // 將接收到的 JSON 陣列轉換為字串儲存
    const processJsonString = JSON.stringify(processData);

    // 使用 INSERT ... ON DUPLICATE KEY UPDATE 語句
    // 表格名稱是 ai_wedding_processes，unique key 是 project_id
    const sql = `
            INSERT INTO ai_wedding_processes (project_id, process_json) -- 表格名稱和欄位修正
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE process_json = VALUES(process_json), updated_at = CURRENT_TIMESTAMP;
        `;
    // 確保 coupleId 參數傳遞的是 project_id
    const [results] = await db.query(sql, [projectId, processJsonString]);

    // 檢查是否實際插入或更新了數據
    if (results.affectedRows === 0) {
      // 這通常表示 project_id 存在但 process_json 內容完全沒變
      console.log(`[Backend PUT /${projectId}] 專案 ID ${projectId} 的流程資料可能沒有變動。`);
      // 檢查 project_id 是否存在以區分是無變動還是找不到專案
      const [checkProject] = await db.query('SELECT project_id FROM wedding_projects WHERE project_id = ?', [projectId]);
      if (checkProject.length === 0) {
        return res.status(404).json({ success: false, message: '找不到指定的專案。' });
      }
      // 如果找到專案但沒有變動，返回成功但提示無變動
      return res.status(200).json({ success: true, message: '流程資料沒有變動，無需儲存。' });
    }


    console.log(`[Backend PUT /${projectId}] 已成功為 project_id: ${projectId} 手動更新流程。`);
    res.json({ success: true, message: '婚禮流程已成功儲存！' });

  } catch (error) {
    sendError(res, `PUT /${projectId}`, error, '儲存流程失敗。');
  }
});


// [POST] /api/design-process/generate-flow - 生成、儲存並回傳流程
router.post('/generate-flow', async (req, res) => {
  // 從請求中獲取 coupleId (應為 projectId) 和偏好設定
  const { coupleId, ...preferences } = req.body;
  const projectId = parseInt(coupleId); // 將 coupleId 視為 project_id

  if (isNaN(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: '缺少或無效的專案 ID。' });
  }

  try {
    // 從資料庫獲取專案的婚禮日期和時間，用於 AI Prompt
    const [projectData] = await db.query(
      'SELECT wedding_date, wedding_time FROM wedding_projects WHERE project_id = ?',
      [projectId]
    );

    if (projectData.length === 0) {
      return res.status(404).json({ success: false, message: '找不到指定的專案，無法生成流程。' });
    }

    const weddingDate = projectData[0].wedding_date;
    const weddingTime = projectData[0].wedding_time;

    // 格式化婚禮日期時間，用於 AI Prompt
    let weddingDateTimeString = '未設定婚禮日期時間';
    if (weddingDate && moment(weddingDate).isValid()) {
      weddingDateTimeString = moment(weddingDate).format('YYYY年M月D日');
      if (weddingTime) { // wedding_time 從資料庫讀取可能是 Date 或字串
        const timeMoment = moment(weddingTime, 'HH:mm:ss'); // 嘗試解析為 HH:mm:ss
        if (timeMoment.isValid()) {
          weddingDateTimeString += ' ' + timeMoment.format('HH點mm分');
        } else {
          // 如果不是標準格式，嘗試直接使用字串（可能會有秒數）
          const timeStr = String(weddingTime);
          // 簡單處理掉秒數部分如果存在
          const timeParts = timeStr.split(':');
          if (timeParts.length >= 2) {
            weddingDateTimeString += ' ' + timeParts[0] + '點' + timeParts[1] + '分';
          } else if (timeStr.trim() !== '') {
            weddingDateTimeString += ' ' + timeStr.trim(); // 其他非空時間字串
          }
        }
      }
    }


    const aiPrompt = `
      你是一位專業的婚禮流程設計師，請根據以下新人提供的資訊和偏好，設計一份詳細且適合他們的婚禮當天流程。
      請仔細閱讀偏好與需求說明，並將其融入流程設計中。
      
      **請嚴格遵守以下輸出格式要求:**
      - 你 **必須** 回傳一個 JSON 陣列，陣列的每個元素是一個物件，包含以下三個鍵："時間", "事件", "備註"。
      - 這些鍵名必須是中文，且完全按照 "時間", "事件", "備註" 來命名。
      - "時間" 欄位請使用文字描述時間點或時間段（例如 "10:00", "10:00 - 10:30", "中午"）。
      - "事件" 欄位請描述當前時間的主要活動內容（例如 "新郎出發", "拜別", "證婚儀式", "用餐"）。
      - "備註" 欄位可以包含更詳細的說明或注意事項。
      - 陣列中的物件順序應按照流程的時間先後排列。
      - 絕對不要在 JSON 陣列的外面添加任何解釋性文字、前言、後語或Markdown格式（如 \`\`\`json 或 \`\`\`）！回傳內容必須是 **純粹的 JSON 陣列字串**。
      - 請確保 JSON 格式是有效的，所有鍵名使用雙引號，字串值使用雙引號，陣列和物件結構正確。
      - AI生成的流程應考慮新人提供的婚禮日期時間 (${weddingDateTimeString})，並圍繞當天的時間點進行安排，即使只是一個參考。

      **新人偏好與需求:**
      - **星座:** ${getValueOrFallback(preferences.horoscope, '未提供')}
      - **血型:** ${getValueOrFallback(preferences.bloodType, '未提供')}
      - **喜歡的顏色:** ${getValueOrFallback(preferences.favoriteColor, '未提供')}
      - **喜歡的季節:** ${getValueOrFallback(preferences.favoriteSeason, '未提供')}
      - **信仰/禁忌說明:** ${getValueOrFallback(preferences.beliefsDescription, '無特殊禁忌')}
      - **偏好/需求說明:** ${getValueOrFallback(preferences.needsDescription, '希望整體流程溫馨、浪漫，並有與賓客的良好互動。')}

      ---
      **參考範例模板 (僅供參考結構和內容方向，AI應生成獨特流程):**
      ${weddingProcessJson}
      ---

      請開始生成流程，並確保輸出是符合要求的純 JSON 陣列。
    `;

    // --- 呼叫 Gemini AI ---
    console.log(`[Backend POST /generate-flow] 正在為專案 ID ${projectId} 呼叫 AI 生成流程...`);
    const aiResponse = await callGeminiAI(aiPrompt);
    console.log(`[Backend POST /generate-flow] 專案 ID ${projectId} 的 AI 原始回應 (開頭):`, aiResponse ? aiResponse.substring(0, 200) + '...' : '無回應'); // 記錄原始回應以備查錯

    // --- 將結果儲存到資料庫 ---
    // 使用 INSERT ... ON DUPLICATE KEY UPDATE 語句
    // 表格名稱是 ai_wedding_processes，unique key 是 project_id
    const sql = `
      INSERT INTO ai_wedding_processes (project_id, process_json) -- 表格名稱和欄位修正
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE process_json = VALUES(process_json), updated_at = CURRENT_TIMESTAMP;
    `;
    // 儲存到資料庫的應該是 AI 返回的原始字串
    await db.query(sql, [projectId, aiResponse]);

    console.log(`[Backend POST /generate-flow] 已成功為 project_id: ${projectId} 儲存/更新 AI 流程。`);

    // --- 回傳結果給前端 ---
    // 回傳 AI 返回的原始字串，讓前端的 universalParser 處理
    res.json({
      success: true,
      message: 'AI 已成功生成並儲存婚禮流程 🎉',
      result: aiResponse // 回傳 AI 原始字串
    });

  } catch (error) {
    console.error(`[Backend POST /generate-flow] 生成或儲存專案 ID ${projectId} 的 AI 流程時發生錯誤:`, error);
    // 區分 AI 服務錯誤和資料庫錯誤
    const errorMessage = error.message.includes('AI 服務') ? error.message : '伺服器內部錯誤，AI 流程處理失敗。';
    sendError(res, 'POST /generate-flow', error, errorMessage);
  }
});

module.exports = router;