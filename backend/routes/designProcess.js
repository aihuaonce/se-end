// backend/routes/designProcess.js

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// 這裡可以嘗試 'gemini-1.5-flash-latest' 或 'gemini-1.5-pro-latest'
// Pro 模型在遵循指令方面通常更優，但成本較高、速度稍慢。
const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest"; 

// --- INITIALIZATION ---
console.log("[Backend AI Service] 初始化 Gemini AI 服務...");
if (!GEMINI_API_KEY) {
  console.error("[Backend AI Service] 錯誤: GEMINI_API_KEY 未設定。請在 .env 檔案中配置此變數。");
}
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME }) : null;

// --- HELPER FUNCTION ---
const getValueOrFallback = (value, fallbackText = '未提供') => {
  // 對於 null、undefined 或只包含空白的字串，返回 fallbackText
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return fallbackText;
  }
  return value;
};

/**
 * 呼叫 Google Gemini AI 服務。
 * @param {string} prompt - 傳送給 AI 的提示文字。
 * @returns {Promise<string>} AI 回傳的文字內容。
 */
const callGeminiAI = async (prompt) => {
  if (!geminiModel) {
    console.error('[Backend AI Service] Gemini AI 服務因缺少 API KEY 或初始化失敗而無法使用。');
    throw new Error('Gemini AI 服務未初始化。請檢查伺服器配置。');
  }

  try {
    console.log("[Backend AI Service] 正在呼叫 Gemini AI...");
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        const safetyRatings = response.candidates?.[0]?.safetyRatings;
        console.error(`[Backend AI Service] Gemini AI 未返回有效內容。結束原因: ${finishReason}`, { safetyRatings });
        throw new Error('AI 因內容安全政策或其他原因未能生成回應，請調整輸入或稍後再試。');
    }

    const text = response.text();
    console.log("[Backend AI Service] Gemini AI 回傳成功。");
    return text;
  } catch (error) {
    console.error('[Backend AI Service] Gemini API 發生錯誤:', error);
    const errorMessage = error.message || '未知錯誤';
    if (error.response && error.response.status) {
        throw new Error(`Gemini API 呼叫失敗: ${error.response.status} - ${errorMessage}`);
    }
    throw new Error(`Gemini API 呼叫失敗: ${errorMessage}`);
  }
};


// --- ROUTE DEFINITION ---
router.post('/generate-flow', async (req, res) => {
  const {
    horoscope, bloodType, favoriteColor, favoriteSeason,
    beliefsDescription, needsDescription
  } = req.body;

  for (const key in req.body) {
    if (typeof req.body[key] !== 'string') {
      console.warn(`[Backend AI Service] 接收到非字串類型欄位: ${key}: ${req.body[key]}`);
    }
  }

  try {
    const aiPrompt = `
      您是一位專業且極其嚴謹的婚禮流程設計師，請務必嚴格遵循指令。
      請根據以下新人資訊與偏好，為他們設計一份詳盡且結構化的 **婚禮日流程表**。
      請確保流程涵蓋從籌備到婚禮結束的各個主要階段，並在每個階段中適當地融入他們的獨特偏好。

      **婚禮背景與新人資訊：**
      - 婚禮風格：西式、浪漫、溫馨
      - 預計賓客數：約120人
      - 場地類型：飯店宴會廳，有戶外證婚區
      - 特殊要求：希望有 **新人第一次見面儀式 (First Look)**，並包含 **感恩父母環節**。不希望有傳統的 **抽捧花**。
      - 新郎新娘星座：${getValueOrFallback(horoscope)}
      - 新郎新娘血型：${getValueOrFallback(bloodType)}
      - 偏好顏色：${getValueOrFallback(favoriteColor)}
      - 偏好季節：${getValueOrFallback(favoriteSeason)}
      - 信仰／禁忌說明：${getValueOrFallback(beliefsDescription, '無')}
      - 特殊偏好與需求：${getValueOrFallback(needsDescription, '無')}

      **輸出要求：**
      **您的整個回應內容必須且只能是單一的 Markdown 程式碼區塊。**
      **請不要在程式碼區塊之外添加任何文字、引言、結語、解釋、標題、或其他非表格內容的段落。**
      **請以\`\`\`markdown\`開頭，並以\`\`\`結尾，將整個表格包含在其中。**
      **表格必須嚴格包含以下三列，順序和名稱不能變動：'時間', '事件', '建議／備註'。**
      **請在「建議／備註」欄位中，融入您作為婚禮顧問的專業見解和對新人偏好的考量，可以使用 Markdown 粗體（例如 **粗體字**）等格式。**
      **請提供具體且合理的精確時間點（例如 '14:00 - 14:30'），並確保事件描述清晰、流程銜接流暢。**
      **表格的內容應該完整且詳盡，直接作為婚禮流程表使用。**

      \`\`\`markdown
      | 時間 | 事件 | 建議／備註 |
      |---|---|---|
      | 09:00 - 11:00 | 新娘妝髮與準備 | 考量到 **${getValueOrFallback(favoriteColor)}** 的偏好，建議新娘在妝容或頭飾上可加入此色系元素。 |
      | 11:00 - 11:30 | 新人第一次見面 (First Look) | 選擇戶外證婚區的浪漫角落進行，攝影師捕捉真摯瞬間，為婚禮增添感動與私密感。 |
      | 11:30 - 12:00 | 賓客入場與迎賓 | 播放輕鬆的爵士樂，賓客簽到區可佈置成 **${getValueOrFallback(favoriteSeason)}** 主題，提供迎賓小點。 |
      | 12:00 - 12:30 | 戶外證婚儀式 | 簡潔溫馨的西式證婚，可由新郎新娘自行撰寫誓詞，展現彼此的愛意。 |
      | 12:30 - 13:00 | 雞尾酒會與合影 | 提供輕食飲品，新人與賓客自由交流合影，可準備與 **${getValueOrFallback(horoscope)}** 相關的趣味拍照道具。 |
      | 13:00 - 13:10 | 宴會廳開場與新人進場 | 播放感動音樂，新人第一次進場，步入宴會廳。建議燈光營造浪漫氛圍。 |
      | 13:10 - 13:20 | 感恩父母環節 | 新人向父母獻花、擁抱，可播放成長照片VCR，感謝父母養育之恩，溫馨感人。 |
      | 13:20 - 13:30 | 主婚人致詞與舉杯 | 邀請雙方主婚人上台致詞，簡短真摯，隨後一同舉杯感謝賓客。 |
      | 13:30 - 14:30 | 婚宴用餐 | 提供豐盛的餐點，賓客自由用餐，新人可短暫休息換裝。 |
      | 14:30 - 14:40 | 新人第二次進場 | 可換上第二套禮服，搭配活潑音樂，或設計趣味進場方式，展現新人另一面。 |
      | 14:40 - 15:10 | 賓客互動遊戲 | 考量新人 **${getValueOrFallback(needsDescription, '無')}** 的需求，可設計新穎的互動遊戲取代傳統抽捧花，增加趣味性與參與感。 |
      | 15:10 - 15:40 | 逐桌敬酒 | 新人與主婚人逐桌感謝賓客，簡短交流，確保所有賓客都能感受到關懷。 |
      | 15:40 - 16:00 | 婚禮蛋糕儀式 | 甜蜜切蛋糕，象徵開啟幸福生活，並與親近賓客合影留念。 |
      | 16:00 - 16:30 | 新人謝客與送客 | 新人於宴會廳出口處與賓客合影並發送伴手禮，溫馨道別。 |
      | 16:30 - 17:00 | 婚禮團隊清場與復原 | 確保所有物品妥善收拾，場地恢復原狀。 |
      \`\`\`
      `;

    const aiResponse = await callGeminiAI(aiPrompt);

    res.json({
      success: true,
      message: 'AI 已成功生成婚禮流程',
      result: aiResponse // AI 的 Markdown 表格回應
    });

  } catch (error) {
    console.error('[Backend AI Service] 產生流程時發生錯誤:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || '伺服器內部錯誤，AI 產生婚禮流程失敗。'
    });
  }
});

module.exports = router;