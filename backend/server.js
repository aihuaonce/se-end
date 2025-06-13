// backend/server.js
const express = require("express");
const cors = require("cors");
require('dotenv').config();

const pool = require('./db.js');

const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const joinRoutes = require('./routes/joinRoutes');
const reserveRoutes = require('./routes/reserveRoutes');

const app = express();

// 中介層設定
app.use(cors());
app.use(express.json());

// 路由設定
app.use('/customers', serviceRoutes);
app.use('/sync-sheet-data', syncRoutes);
app.use('/update-status', statusRoutes);
app.use('/', joinRoutes);
app.use('/', reserveRoutes); // ✅ 改成根目錄，代表請求 POST /reserve 就會命中這個路由

// 啟動伺服器
const PORT = process.env.PORT || 5713;
app.listen(PORT, () => {
    console.log(`伺服器運行在埠號 ${PORT}`);
});
