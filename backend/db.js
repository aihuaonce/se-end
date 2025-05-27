// backend/db.js
const mysql = require("mysql2");
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 測試資料庫連接
pool.getConnection((err, connection) => {
    if (err) {
        console.error("資料庫連接失敗:", err);
        // 您可以選擇在這裡終止應用程式或採取其他錯誤處理措施
    } else {
        console.log("成功連接到資料庫");
        connection.release(); // 釋放連接
    }
});

module.exports = pool; // 導出連接池，讓其他檔案可以使用