const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối PostgreSQL:', err.stack);
  } else {
    console.log('Đã kết nối thành công tới Database PostgreSQL!');
  }
});

// Export hàm query từ pool để controller có thể gọi db.query()
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};