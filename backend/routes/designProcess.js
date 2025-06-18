// designProcess.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { callGeminiAI } = require('./aiService');

// --- 讀取 weddingProcess.json 範例模板 ---
const weddingProcessPath = path.join(__dirname, '../weddingProcess.json');
const weddingProcessJson = fs.readFileSync(weddingProcessPath, 'utf8');

const getValueOrFallback = (value, fallbackText) => {
  return (value && value.trim()) ? value.trim() : fallbackText;
};

router.post('/generate-flow', async (req, res) => {
  const preferences = req.body;

  try {
    // --- 組 Prompt (強力要求 JSON 格式) ---
    const aiPrompt = `
你是一位專業的婚禮流程設計師，你的任務是根據「新人偏好與需求」設計一份詳細的婚禮流程。

**非常重要的輸出格式要求:**
- 你 **必須** 回傳一個 JSON 陣列 (an array of JSON objects)。
- 陣列中的每一個物件代表一個流程項目，且 **必須** 包含三個鍵(key)："時間", "事件", "備註"。
- 所有的值(value)都必須是字串(string)。
- **絕對不要** 在 JSON 陣列的外面添加任何解釋、標題、Markdown 標記 (如 \`\`\`json) 或任何其他文字。你的回應 **必須** 直接以 "[" 開始，以 "]" 結束。

**JSON 結構範例:**
[
  {
    "時間": "10:00 - 11:00",
    "事件": "新娘梳化",
    "備註": "攝影師可在此時捕捉準備過程的花絮。"
  },
  {
    "時間": "11:00 - 11:30",
    "事件": "婚禮彩排",
    "備註": "與主持人、主婚人、伴郎伴娘確認走位與音樂。"
  }
]

---

**新人偏好與需求:**
- **星座:** ${getValueOrFallback(preferences.horoscope, '未提供')}
- **血型:** ${getValueOrFallback(preferences.bloodType, '未提供')}
- **喜歡的顏色:** ${getValueOrFallback(preferences.favoriteColor, '未提供')}
- **喜歡的季節:** ${getValueOrFallback(preferences.favoriteSeason, '未提供')}
- **信仰/禁忌說明:** ${getValueOrFallback(preferences.beliefsDescription, '無特殊禁忌')}
- **偏好/需求說明:** ${getValueOrFallback(preferences.needsDescription, '希望整體流程溫馨、浪漫，並有與賓客的良好互動。')}

---

**參考範例模板 (請學習其結構，但不要複製):**
${weddingProcessJson}
`;

    // --- 呼叫 Gemini AI ---
    const aiResponse = await callGeminiAI(aiPrompt);

    // --- 回傳結果 ---
    res.json({
      success: true,
      message: 'AI 已成功生成婚禮流程 🎉',
      result: aiResponse
    });

  } catch (error) {
    console.error('[Backend AI Service] 產生流程時發生錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '伺服器內部錯誤，AI 產生婚禮流程失敗。'
    });
  }
});

module.exports = router;