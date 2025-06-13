const mysql = require("mysql2/promise"); // ✅ 用 promise 模式支援 async/await

require('dotenv').config(); // 或 require('dotenv').config({ path: __dirname + '/../.env' });
console.log("=== 環境變數檢查 ===");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("=================");


const pool = mysql.createPool({

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    timezone: "+08:00"
});

// 測試資料庫連接
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ 資料庫連接失敗:", err);
    } else {
        console.log("✅ 成功連接到資料庫");
        connection.release();
    }
});

module.exports = pool;

