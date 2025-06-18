// backend/server.js - 專案的主後端伺服器檔案

/* eslint-env node */ // 告訴 ESLint 這是 Node.js 環境

const express = require('express');
const cors = require('cors');
const path = require('path');
// 引入 mysql2/promise 用於資料庫連接 (如果您使用 MySQL)
const mysql = require('mysql2/promise'); 

// 載入環境變數：確保 .env 檔案在 server.js 所在的 backend/ 目錄
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '.env') });
if (dotenvResult.error) {
    console.error("dotenv 載入 .env 檔案時發生錯誤 (server.js):", dotenvResult.error);
    process.exit(1); // 環境變數載入失敗則終止伺服器啟動
} else if (dotenvResult.parsed) {
    console.log("dotenv 成功解析 .env 檔案。載入變數數量:", Object.keys(dotenvResult.parsed).length);
} else {
    console.log("dotenv 未解析任何變數，可能檔案為空或格式錯誤。");
    process.exit(1);
}

// 檢查必要的環境變數
const PORT = process.env.PORT || 5713;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306; // 新增對 DB_PORT 的處理

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error("錯誤：缺少必要的資料庫環境變數 (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)。請檢查 .env 檔案。");
    process.exit(1);
} else {
    console.log("所有必要的資料庫環境變數已載入。");
}

// 引入您的資料庫連接池模組 (請確認這個檔案是否存在且內容正確)
const pool = require('./db.js'); // 假設您的 db.js 檔案位於 backend/db.js

// 引入您現有的路由模組
const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const joinRoutes = require('./routes/joinRoutes');
const reserveRoutes = require('./routes/reserveRoutes');
const financeRoutes = require('./routes/financeRoutes');
const projectRoutes = require('./routes/projectRoutes');

// 引入 AI 功能的路由模組
// 因為 AI.js 在 routes/ 目錄下，所以路徑是 ./routes/AI.js
const aiRoutes = require('./routes/AI.js'); 

const app = express();

// 設定 Express 應用程式使用的 Middleware
app.use(cors()); // 允許跨域請求
app.use(express.json()); // 解析 JSON 格式的請求體

// --- 範例資料庫連接測試 (可移除或替換為您實際的連接邏輯) ---
// 這是一個使用 mysql2/promise 的範例。請根據您實際使用的資料庫類型和庫來修改此部分。
// 這裡假設您的 db.js 會導出一個連接池或連接實例。
// 如果您的 db.js 導出的是一個連接池，這裡只需要確保它被引入。
// 如果 db.js 是個連接函數，您可能需要在這裡調用它。

// 檢查資料庫連接
async function testDatabaseConnection() {
    try {
        console.log(`嘗試連接到 MySQL 資料庫: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
        // 這裡使用 pool.getConnection() 來測試連接
        const connection = await pool.getConnection(); 
        console.log('✅ 成功連接到您的主要資料庫！');
        connection.release(); // 釋放連接
    } catch (error) {
        console.error('❌ 連接主要資料庫失敗:', error.message);
        // 如果資料庫連接失敗，通常應終止應用程式
        process.exit(1); 
    }
}

// 在伺服器啟動前測試資料庫連接
testDatabaseConnection();

// --- 掛載您現有的路由 ---
app.use('/customers', serviceRoutes);
app.use('/sync-sheet-data', syncRoutes);
app.use('/update-status', statusRoutes);
app.use('/', joinRoutes);
app.use('/', reserveRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/project', projectRoutes);

// --- 掛載 AI 相關的路由 ---
// 將所有來自 aiRoutes 的路由掛載到 /api 路徑下
// 這表示前端請求 /api/guests、/api/generateBlessing 等都會由 aiRoutes 處理
app.use('/api', aiRoutes); 
console.log('✅ AI 相關路由已載入並掛載於 /api 路徑下。');


// 啟動伺服器 (不再重複宣告 PORT)
app.listen(PORT, () => {
    console.log(`🚀 主後端伺服器運行在埠號 ${PORT}`);
    console.log(`💡 請確保您的前端應用程式已配置為向此埠號發送請求。`);
});
