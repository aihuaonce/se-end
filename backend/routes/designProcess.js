const express = require('express');
const router = express.Router();
const db = require('../db'); // 假設您的資料庫連線設定在 db.js
const { callGeminiAI } = require('./aiService'); // AI 服務不變
const fs = require('fs');
const path = require('path');

// 讀取範例模板 (這部分不變)
const weddingProcessPath = path.join(__dirname, '../weddingProcess.json');
const weddingProcessJson = fs.readFileSync(weddingProcessPath, 'utf8');

const getValueOrFallback = (value, fallbackText) => {
  return (value && value.trim()) ? value.trim() : fallbackText;
};


// [新增] GET /api/design-process/:coupleId - 讀取已儲存的流程
router.get('/:coupleId', async (req, res) => {
  const { coupleId } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT process_json FROM ai_wedding_processes WHERE wedding_couple_id = ?',
      [coupleId]
    );

    if (rows.length > 0) {
      // 找到流程，直接回傳 JSON 內容
      res.json({ success: true, data: rows[0].process_json });
    } else {
      // 找不到流程
      res.status(404).json({ success: false, message: '尚未生成或儲存任何流程。' });
    }
  } catch (error) {
    console.error('[Backend] 讀取 AI 流程時發生錯誤:', error);
    res.status(500).json({ success: false, message: '讀取已存流程失敗。' });
  }
});


// [修改] POST /api/design-process/generate-flow - 生成、儲存並回傳流程
router.post('/generate-flow', async (req, res) => {
  // 從請求中獲取 coupleId 和偏好設定
  const { coupleId, ...preferences } = req.body;

  if (!coupleId) {
    return res.status(400).json({ success: false, message: '缺少 wedding_couple_id。' });
  }

  try {
    // --- 組 Prompt (與之前相同) ---
    const aiPrompt = `
      你是一位專業的婚禮流程設計師... (此處省略與之前版本相同的長篇 Prompt) ...
      **非常重要的輸出格式要求:**
      - 你 **必須** 回傳一個 JSON 陣列...
      - 絕對不要在 JSON 陣列的外面添加任何解釋...
      **新人偏好與需求:**
      - **星座:** ${getValueOrFallback(preferences.horoscope, '未提供')}
      - **血型:** ${getValueOrFallback(preferences.bloodType, '未提供')}
      - **喜歡的顏色:** ${getValueOrFallback(preferences.favoriteColor, '未提供')}
      - **喜歡的季節:** ${getValueOrFallback(preferences.favoriteSeason, '未提供')}
      - **信仰/禁忌說明:** ${getValueOrFallback(preferences.beliefsDescription, '無特殊禁忌')}
      - **偏好/需求說明:** ${getValueOrFallback(preferences.needsDescription, '希望整體流程溫馨、浪漫，並有與賓客的良好互動。')}
      ---
      **參考範例模板...**
      ${weddingProcessJson}
    `;

    // --- 呼叫 Gemini AI ---
    const aiResponse = await callGeminiAI(aiPrompt);

    // --- [新增] 將結果儲存到資料庫 ---
    // 使用 INSERT ... ON DUPLICATE KEY UPDATE (UPSERT)
    // 如果紀錄已存在則更新，不存在則新增。前提是 wedding_couple_id 是 UNIQUE KEY。
    const sql = `
      INSERT INTO ai_wedding_processes (wedding_couple_id, process_json)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE process_json = VALUES(process_json), updated_at = CURRENT_TIMESTAMP;
    `;
    await db.query(sql, [coupleId, aiResponse]);
    console.log(`[Backend] 已成功為 couple_id: ${coupleId} 儲存/更新 AI 流程。`);

    // --- 回傳結果給前端 (不變) ---
    res.json({
      success: true,
      message: 'AI 已成功生成並儲存婚禮流程 🎉',
      result: aiResponse
    });

  } catch (error) {
    console.error('[Backend] 生成或儲存 AI 流程時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '伺服器內部錯誤，AI 流程處理失敗。'
    });
  }
});

module.exports = router;