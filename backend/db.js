require('dotenv').config(); 
const mysql = require('mysql2/promise'); 


const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', 
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || '', 
  database: process.env.DB_NAME || 'marry',
  waitForConnections: true, 
  connectionLimit: 10, 
  queueLimit: 0 
});


(async () => {
  try {
    const conn = await pool.getConnection(); 
    console.log(' 成功連接到資料庫！MySQL 連線 ID:', conn.threadId); 
    conn.release(); 
  } catch (err) {
    console.error('資料庫連接失敗！請檢查您的 MySQL 伺服器狀態與 .env 配置:', err.message);
    console.error('連線參數:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    process.exit(1);
  }
})();

module.exports = pool; 