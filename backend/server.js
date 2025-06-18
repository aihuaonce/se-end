const express = require("express");
const cors = require("cors");
require('dotenv').config();

const pool = require('./db.js');

const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const joinRoutes = require('./routes/joinRoutes');
const reserveRoutes = require('./routes/reserveRoutes');
const financeRoutes = require('./routes/financeRoutes');
const projectRoutes = require('./routes/projectRoutes');
const designProcessRoutes = require('./routes/designProcess');
const vendorRoutes = require('./routes/vendorRoutes');


const app = express();

// 設定 Express 應用程式使用的 Middleware
app.use(cors()); // 允許跨域請求
app.use(express.json()); // 解析 JSON 格式的請F求體

app.use('/customers', serviceRoutes);
app.use('/sync-sheet-data', syncRoutes);
app.use('/update-status', statusRoutes);
app.use('/', joinRoutes);
app.use('/', reserveRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/design-process', designProcessRoutes);
app.use('/api/vendors', vendorRoutes);

const designProcessRouter = require('./routes/designProcess'); // 請確認路徑正確
app.use('/api/design-process', designProcessRouter);

// 啟動伺服器
const PORT = process.env.PORT || 5713; // 從 .env 讀取埠號，如果沒有則預設 5713
app.listen(PORT, () => {
    console.log(`伺服器運行在埠號 ${PORT}`);
});