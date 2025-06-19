// backend/server.js - 專案的主後端伺服器檔案

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

const express = require('express');
const cors = require('cors');
const path = require('path');
// 引入 mysql2/promise 用於資料庫連接，提供 Promise-based 的 API。
const mysql = require('mysql2/promise');

// 載入環境變數：確保 .env 檔案在 server.js 所在的 backend/ 目錄。
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '.env') });
if (dotenvResult.error) {
    console.error("dotenv 載入 .env 檔案時發生錯誤 (server.js):", dotenvResult.error);
    process.exit(1); // 環境變數載入失敗則終止伺服器啟動。
} else {
    console.log("dotenv 成功解析 .env 檔案。");
}

// === 新增診斷代碼開始 (請在問題解決後移除) ===
console.log('\n--- 環境變數診斷 (由 server.js 內部印出) ---');
console.log('process.env.GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
console.log('process.env.GOOGLE_SHEET_ID:', process.env.GOOGLE_SHEET_ID);
console.log('process.env.GOOGLE_SHEET_RANGE:', process.env.GOOGLE_SHEET_RANGE);
console.log('--- 環境變數診斷結束 ---\n');
// === 新增診斷代碼結束 ===

// 檢查必要的環境變數是否已載入。
const PORT = process.env.PORT || 5713; // 伺服器監聽的埠號，預設為 5713。
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;

// 再次檢查核心資料庫環境變數的完整性。
if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error("錯誤：缺少必要的資料庫環境變數 (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)。請檢查 .env 檔案。");
    process.exit(1); // 缺少關鍵變數則終止伺服器。
} else {
    console.log("所有必要的資料庫環境變數已載入。");
}

// --- 新增 Google Sheets 相關環境變數檢查 ---
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE;

if (!GOOGLE_APPLICATION_CREDENTIALS || !GOOGLE_SHEET_ID || !GOOGLE_SHEET_RANGE) {
    console.warn("⚠️ 警告：缺少 Google Sheets 相關的環境變數 (GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_SHEET_ID, GOOGLE_SHEET_RANGE)。Google Sheets 功能可能無法正常運作。請檢查 .env 檔案。");
    // 不終止進程，因為可能只有部分功能依賴 Google Sheets
}
// --- 結束 Google Sheets 相關環境變數檢查 ---


// 引入您的資料庫連接池模組。
const pool = require('./db.js');

// 引入您的 Google Sheets 服務初始化函式
const { initializeSheetsClient } = require('./AI/googleSheetsService');

// 引入您現有的路由模組。
const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const joinRoutes = require('./routes/joinRoutes');
const reserveRoutes = require('./routes/reserveRoutes');
const financeRoutes = require('./routes/financeRoutes');
const projectRoutes = require('./routes/projectRoutes');

// 引入 AI 功能的路由模組。
const aiRoutes = require('./routes/AI.js'); 

const app = express();

// 設定 Express 應用程式使用的 Middleware。
app.use(cors()); // 啟用 CORS (跨域資源共享)，允許來自不同域的請求。
app.use(express.json()); // 使用內建的 JSON 解析器，解析入站請求中 JSON 格式的數據。

// 函數：測試資料庫連接。
async function testDatabaseConnection() {
    try {
        console.log(`嘗試連接到 MySQL 資料庫: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
        const connection = await pool.getConnection();
        console.log('✅ 成功連接到您的主要資料庫！');
        connection.release(); // 測試完成後立即釋放連接回連接池。
    } catch (error) {
        console.error('❌ 連接主要資料庫失敗:', error.message);
        process.exit(1);
    }
}

// 將伺服器啟動邏輯包裹在一個 async 函式中，以等待非同步初始化完成
async function startServer() {
    try {
        // 在伺服器啟動前測試資料庫連接。
        await testDatabaseConnection();

        // 關鍵修正：在伺服器監聽前初始化 Google Sheets 客戶端
        // 這確保了當處理 /api/ai/guests 請求時，sheets 物件已經準備好
        await initializeSheetsClient();
        console.log('✅ Google Sheets 客戶端及標頭已全部初始化完成！');

        // --- 掛載您現有的路由 ---
        // 如果 service.js 確實匯出一個 Express 路由器，您可以取消註解此行
        // app.use('/customers', serviceRoutes);
        app.use('/sync-sheet-data', syncRoutes);
        app.use('/update-status', statusRoutes);
        app.use('/', joinRoutes);
        app.use('/', reserveRoutes);
        app.use('/api/finance', financeRoutes);
        app.use('/api/project', projectRoutes);

        // --- 掛載 AI 相關的路由 ---
        app.use('/api/ai', aiRoutes);
        console.log('✅ AI 相關路由已載入並掛載於 /api/ai 路徑下。');


        // 啟動伺服器並監聽指定的埠號。
        app.listen(PORT, () => {
            console.log(`🚀 主後端伺服器運行在埠號 ${PORT}`);
            console.log(`💡 請確保您的前端應用程式已配置為向此埠號發送請求。`);
        });

    } catch (error) {
        console.error('❌ 伺服器啟動失敗:', error.message);
        process.exit(1); // 初始化失敗則終止伺服器啟動
    }
}

// 呼叫伺服器啟動函式
startServer();
