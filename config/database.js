const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// async function checkDBConnection() {
//     try {
//       const [rows] = await pool.query("SELECT 1");
//       console.log("✅ Database connected successfully!");
//     } catch (error) {
//       console.error("❌ Database connection failed:", error);
//     }
//   }
  
//   checkDBConnection();


module.exports = pool;