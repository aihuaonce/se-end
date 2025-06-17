const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log("目前的 GEMINI API KEY 是：", process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // 你需要在 .env 設定 GEMINI_API_KEY

const callGeminiAI = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error('Gemini API 發生錯誤:', JSON.stringify(error, null, 2));
    throw error;
  }
};

module.exports = { callGeminiAI };
