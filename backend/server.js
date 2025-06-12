// backend/server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");

const pool = require('./db');
const serviceRoutes = require('./routes/service');
const syncRoutes = require('./routes/syncRoutes');
const statusRoutes = require('./routes/statusRoutes');
const financeRoutes = require('./routes/financeRoutes');    

const app = express();

app.use(cors());
app.use(express.json());

app.use('/customers', serviceRoutes);
app.use('/sync-sheet-data', syncRoutes);
app.use('/update-status', statusRoutes);
app.use('/api/finance', financeRoutes);  

const PORT = process.env.PORT || 5713;
app.listen(PORT, () => {
  console.log(`伺服器運行在埠號 ${PORT}`);
});
