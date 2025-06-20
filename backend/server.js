const express = require("express");
const cors = require("cors");
require('dotenv').config();

const pool = require('./db.js');

const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const authRoutes = require('./routes/authRoutes.js');
const reserveRoutes = require('./routes/reserveRoutes');
const financeRoutes = require('./routes/financeRoutes');
const projectRoutes = require('./routes/projectRoutes');
const designProcessRoutes = require('./routes/designProcess');
const vendorRoutes = require('./routes/vendorRoutes');
const designProcessRouter = require('./routes/designProcess'); // 請確認路徑正確
const planRoutes = require('./routes/planRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const customerRoutes = require('./routes/customer');
const levelRoutes = require('./routes/Level.js');

const app = express();

// 設定 Express 應用程式使用的 Middleware
app.use(cors()); // 允許跨域請求
app.use(express.json()); // 解析 JSON 格式的請F求體

app.use('/customers', serviceRoutes);
app.use('/sync-sheet-data', syncRoutes);
app.use('/update-status', statusRoutes);
app.use('/api', authRoutes);
app.use('/api/reserve', reserveRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/design-process', designProcessRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/plans', planRoutes);
app.use('/api', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', customerRoutes);
app.use('/api', levelRoutes);


app.use('/api/design-process', designProcessRouter);

// 啟動伺服器
const PORT = process.env.PORT || 5713; // 從 .env 讀取埠號，如果沒有則預設 5713
app.listen(PORT, () => {
    console.log(`伺服器運行在埠號 ${PORT}`);
});