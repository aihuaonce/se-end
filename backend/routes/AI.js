// backend/routes/AI.js
// 這個檔案現在作為一個路由模組，被主伺服器 (例如 server.js) 引入

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

const express = require('express');
const path = require('path');

// 載入環境變數：確保 .env 檔案在 backend/ 目錄
// 因為此檔案在 backend/routes/，所以 .env 在上層目錄(../)
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
if (dotenvResult.error) {
    console.error("dotenv 載入 .env 檔案時發生錯誤 (backend/routes/AI.js):", dotenvResult.error);
    // 在這裡不使用 process.exit(1)，因為這個檔案現在是一個模組，讓主應用程式決定如何處理錯誤
} else if (dotenvResult.parsed) {
    console.log("dotenv 成功解析 .env 檔案。載入變數數量:", Object.keys(dotenvResult.parsed).length);
} else {
    console.log("dotenv 未解析任何變數，可能檔案為空或格式錯誤。");
}

// 檢查必要的環境變數 (只在此處記錄，讓主應用程式決定是否退出)
const OPENAI_KEY = process.env.OPENAI_KEY;
const DID_API_KEY = process.env.DID_API_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEETS_KEY_FILE = process.env.GOOGLE_SHEETS_KEY_FILE;

if (!OPENAI_KEY || !DID_API_KEY || !GOOGLE_SHEET_ID || !GOOGLE_SHEETS_KEY_FILE) {
    console.warn("警告：缺少必要的 AI 環境變數。請檢查 .env 檔案中是否設定了 OPENAI_KEY, DID_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SHEETS_KEY_FILE。部分 AI 功能可能無法運作。");
} else {
    console.log("AI 功能所需的所有必要的環境變數已載入。");
}

// 引入功能模組
// 因為此檔案在 backend/routes/，而功能模組在 backend/AI/，所以路徑是 ../AI/
const { readGuestsFromSheet, updateSheetCell, HEADER_MAPPING } = require('../AI/googleSheetsService.js');
const { processBlessings } = require('../AI/generateBlessings.js'); 
const { processAvatars } = require('../AI/generateAvatar.js');      

// 使用 express.Router() 來創建一個可獨立定義路由的實例
const router = express.Router(); 

// --- API 端點 ---

/**
 * GET /guests
 * 獲取所有賓客數據 (路徑是 /api/guests)
 */
router.get('/guests', async (req, res) => { 
    try {
        const guests = await readGuestsFromSheet();
        res.json(guests);
    } catch (error) {
        console.error('獲取賓客數據失敗:', error);
        res.status(500).json({ message: '獲取賓客數據失敗', error: error.message });
    }
});

/**
 * POST /generateBlessing
 * 觸發為選定賓客生成祝福語 (路徑是 /api/generateBlessing)
 * 請求體: { guestIndexes: [0, 2, ...] }
 */
router.post('/generateBlessing', async (req, res) => { 
    const { guestIndexes } = req.body;
    if (!Array.isArray(guestIndexes) || guestIndexes.length === 0) {
        return res.status(400).json({ message: '請提供有效的賓客索引列表。' });
    }

    try {
        const result = await processBlessings(guestIndexes);
        res.json({ message: '祝福語生成請求已處理。', result });
    } catch (error) {
        console.error('生成祝福語失敗:', error);
        res.status(500).json({ message: '生成祝福語失敗', error: error.message });
    }
});

/**
 * POST /generateAvatar
 * 觸發為選定賓客生成 AI 影片 (路徑是 /api/generateAvatar)
 * 請求體: { guestIndexes: [0, 2, ...] }
 */
router.post('/generateAvatar', async (req, res) => { 
    const { guestIndexes } = req.body;
    if (!Array.isArray(guestIndexes) || guestIndexes.length === 0) {
        return res.status(400).json({ message: '請提供有效的賓客索引列表。' });
    }

    try {
        const result = await processAvatars(guestIndexes);
        res.json({ message: 'AI 影片生成請求已處理。', result });
    } catch (error) {
        console.error('生成 AI 影片失敗:', error);
        res.status(500).json({ message: '生成 AI 影片失敗', error: error.message });
    }
});

// 將這個 router 模組匯出，讓主 Express 應用程式來使用它。
module.exports = router;
