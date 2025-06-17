const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // 載入 .env 檔案中的環境變數

// =======================================================
// 優化點 1: 將 GoogleGenerativeAI 實例化一次
// 這樣在每次 API 請求時，就不會重複初始化 Gemnini AI 客戶端
// =======================================================
console.log("[Backend AI Service] 初始化 Gemini AI 服務...");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("[Backend AI Service] 錯誤: GEMINI_API_KEY 未設定。請在 .env 檔案中配置此變數。");
  // 在生產環境中，可以選擇拋出錯誤或禁用 AI 功能
  // process.exit(1);
}
// 僅在開發環境顯示是否載入，不顯示實際的 key 以避免安全問題
if (process.env.NODE_ENV !== 'production') {
  console.log("[Backend AI Service] GEMINI_API_KEY 是否已載入:", !!GEMINI_API_KEY);
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// =======================================================
// 優化點 2: 將 Gemini Model 實例化一次
// 每次呼叫 AI 時，直接使用這個預先建立好的 model 實例
// =======================================================
const geminiModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' }) : null;

/**
 * 呼叫 Google Gemini AI 服務。
 * @param {string} prompt - 傳送給 AI 的提示文字。
 * @returns {Promise<string>} AI 回傳的文字內容。
 * @throws {Error} 如果 Gemini API 發生錯誤。
 */
const callGeminiAI = async (prompt) => {
  if (!geminiModel) {
    throw new Error('Gemini AI 服務未初始化。請檢查 GEMINI_API_KEY 配置。');
  }

  try {
    console.log("[Backend AI Service] 正在呼叫 Gemini AI...");
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text(); // 獲取純文本回應
    console.log("[Backend AI Service] Gemini AI 回傳成功。");
    return text;
  } catch (error) {
    console.error('[Backend AI Service] Gemini API 發生錯誤:', JSON.stringify(error, null, 2));
    throw new Error('Gemini API 呼叫失敗，請檢查 API 設定或重試。');
  }
};

// =======================================================
// 路由定義
// =======================================================

/**
 * POST /api/design-process/generate-flow
 * 根據客戶提供的偏好，呼叫 AI 生成婚禮流程。
 *
 * Request Body 範例 (與 DesignProcessDetail.jsx 的狀態命名匹配):
 * {
 *   "horoscope": "天秤座、雙子座", // 注意，前端會將多選的陣列轉換為字串
 *   "bloodType": "O型",
 *   "favoriteColor": "粉紅色",
 *   "favoriteSeason": "秋季",
 *   "beliefsDescription": "雙方家長信奉佛教，婚禮不宜有殺生行為。",
 *   "needsDescription": "偏好簡約現代風格，不喜歡過於傳統的儀式，希望流程緊湊有趣。"
 * }
 */
router.post('/generate-flow', async (req, res) => {
  try {
    // 從請求體中獲取偏好資料，這些鍵名應與前端 DesignProcessDetail.jsx 發送的數據一致
    const {
      horoscope,        // 星座 (前端 array.join('、') 得到)
      bloodType,        // 血型 (前端 array.join('、') 得到)
      favoriteColor,    // 顏色
      favoriteSeason,   // 季節 (前端 array.join('、') 得到)
      beliefsDescription, // 信仰／禁忌說明
      needsDescription  // 偏好需求說明
    } = req.body;

    // 將偏好整理成 Prompt
    // 提供更清晰的指示給 AI，讓它知道如何生成結構化的內容
    const aiPrompt = `
      請根據以下新人偏好與資訊，為他們設計一份詳細且結構化的婚禮流程。
      請確保流程涵蓋從籌備到婚禮結束的各個主要階段，並在每個階段中適當地融入他們的獨特偏好。
      你的回答請使用 Markdown 格式，以便於前端渲染，例如用 **粗體** 標記重要部分，用 - 符號作為條列。

      **新人資訊與偏好：**
      - 新郎新娘星座：${horoscope || '未提供'}
      - 新郎新娘血型：${bloodType || '未提供'}
      - 偏好顏色：${favoriteColor || '未提供'}
      - 偏好季節：${favoriteSeason || '未提供'}
      - 信仰／禁忌說明：${beliefsDescription || '無'}
      - 特殊偏好與需求：${needsDescription || '無'}

      **請以清晰的條列式或段落形式呈現流程。**

      **範例輸出結構 (請根據實際內容填充，並用 Markdown 格式)：**
      ---
      **[婚禮流程設計]**

      **1. 籌備階段 (Planning Phase):**
      - **主題設定與風格：** 考量新人偏好顏色 **${favoriteColor || '未提供'}** 和季節 **${favoriteSeason || '未提供'}**，建議婚禮主題可設計為...
      - **場地選擇：** 針對新人對 **${beliefsDescription || '無'}** 的信仰或禁忌，場地選擇與佈置上建議...
      - **視覺元素：** 融入星座 **${horoscope || '未提供'}** 的元素，例如在邀請函、背板設計中...

      **2. 儀式流程 (Ceremony Flow):**
      - **進場儀式：** 為滿足新人 **${needsDescription || '無'}** 的需求，可以考慮設計獨特的進場方式，例如...
      - **誓詞環節：** 建議簡潔而真摯的誓詞，呼應新人對簡約風格的偏好。
      - **互動安排：** 根據新人血型 **${bloodType || '未提供'}** （如果適用，可移除或替換），或利用季節元素...

      **3. 宴會細節 (Reception Details):**
      - **餐飲規劃：** 考慮季節 **${favoriteSeason || '未提供'}** 選用當季食材，並避免觸及 **${beliefsDescription || '無'}** 相關禁忌。
      - **節目設計：** 結合新人 **${needsDescription || '無'}** 的需求，加入有趣的互動遊戲或表演，如...
      - **送客環節：** 可準備與婚禮主題色 **${favoriteColor || '未提供'}** 相關的小禮物。

      **4. 後續跟進 (Post-Wedding Follow-up):**
      - ...
      ---
      請務必將所有提供的偏好資訊自然地融合進流程設計中，並避免提及未提供的資訊。
      `;

    // 呼叫 Gemini AI 服務
    const aiResponse = await callGeminiAI(aiPrompt);

    res.json({
      success: true,
      message: 'AI 已成功生成婚禮流程',
      result: aiResponse // AI 的純文本回應，前端將負責渲染 Markdown
    });

  } catch (error) {
    console.error('[Backend AI Service] AI 產生流程時發生錯誤:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'AI 產生婚禮流程失敗，請稍後再試。'
    });
  }
});

module.exports = router;