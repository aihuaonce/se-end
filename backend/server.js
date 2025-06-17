// backend/server.js
const express = require("express");
const cors = require("cors");
require('dotenv').config();

const pool = require('./db');

const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// 設定 Express 應用程式使用的 Middleware
app.use(cors()); // 允許跨域請求
app.use(express.json()); // 解析 JSON 格式的請求體

app.use('/customers', serviceRoutes);
app.use('/sync-sheet-data', syncRoutes);
app.use('/update-status', statusRoutes);
app.use('/api/project', projectRoutes);

// 啟動伺服器
const PORT = process.env.PORT || 5713; // 從 .env 讀取埠號，如果沒有則預設 5713
app.listen(PORT, () => {
    console.log(`伺服器運行在埠號 ${PORT}`);
});