// backend/routes/AI.js
const express = require('express');
const router = express.Router(); // 建立一個 Express 路由器實例
const { processAvatars } = require('../AI/generateAvatar'); // 引入 AI 分身影片生成的核心邏輯
const { processBlessings } = require('../AI/generateBlessings'); // 引入 AI 祝福語生成的核心邏輯
const { readGoogleSheet } = require('../AI/googleSheetsService'); // 引入讀取 Google Sheet 的服務

// 從環境變數獲取 Google Sheet ID 和範圍，用於讀取賓客數據
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE;

/**
 * GET /api/ai/guests
 * 獲取所有賓客數據。
 */
router.get('/guests', async (req, res) => {
    try {
        if (!GOOGLE_SHEET_ID || !GOOGLE_SHEET_RANGE) {
            console.error('缺少 GOOGLE_SHEET_ID 或 GOOGLE_SHEET_RANGE 環境變數，無法讀取賓客數據。');
            return res.status(500).json({ success: false, message: '伺服器配置錯誤：缺少 Google Sheet ID 或範圍。' });
        }

        const guests = await readGoogleSheet(GOOGLE_SHEET_ID, GOOGLE_SHEET_RANGE);
        res.status(200).json({ success: true, guests: guests });
    } catch (error) {
        console.error('在 /guests 路由中讀取賓客數據失敗:', error);
        res.status(500).json({ success: false, message: '載入賓客數據失敗。', error: error.message });
    }
});

/**
 * POST /api/ai/generate-blessings
 * 觸發 AI 祝福語生成流程。
 * 接收一個包含要處理的賓客索引的陣列。
 */
router.post('/generate-blessings', async (req, res) => {
    try {
        const { guestIndexes } = req.body; // 期望請求體中包含 guestIndexes 陣列

        // 驗證輸入
        if (!guestIndexes || !Array.isArray(guestIndexes) || guestIndexes.length === 0) {
            return res.status(400).json({ success: false, message: '未提供賓客索引。' });
        }

        console.log(`收到請求，將為以下索引的賓客生成祝福語: ${guestIndexes.join(', ')}`);

        // 呼叫核心邏輯來處理祝福語生成
        const result = await processBlessings(guestIndexes);

        // 根據處理結果回傳回應
        res.status(200).json(result);
    } catch (error) {
        console.error('在 /generate-blessings 路由中發生錯誤:', error);
        // 回傳 500 內部伺服器錯誤，並包含錯誤訊息
        res.status(500).json({ success: false, message: '生成祝福語時發生內部伺服器錯誤。', error: error.message });
    }
});

/**
 * POST /api/ai/generate-avatar-video
 * 觸發 AI 分身影片生成流程。
 * 接收一個包含要處理的賓客索引的陣列。
 */
router.post('/generate-avatar-video', async (req, res) => {
    try {
        const { guestIndexes } = req.body; // 期望請求體中包含 guestIndexes 陣列

        // 驗證輸入
        if (!Array.isArray(guestIndexes) || guestIndexes.length === 0) {
            return res.status(400).json({ success: false, message: '未提供賓客索引。' });
        }
        console.log(`收到請求，將為以下索引的賓客生成 AI 影片: ${guestIndexes.join(', ')}`);

        // 呼叫核心邏輯來處理分身影片生成
        const result = await processAvatars(guestIndexes);

        // 根據處理結果回傳回應
        res.status(200).json(result);
    } catch (error) {
        console.error('在 /generate-avatar-video 路由中發生錯誤:', error);
        // 回傳 500 內部伺服器錯誤，並包含錯誤訊息
        res.status(500).json({ success: false, message: '生成 AI 影片時發生內部伺服器錯誤。', error: error.message });
    }
});

module.exports = router; // 匯出路由器實例
