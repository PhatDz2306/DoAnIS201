const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Khởi tạo app Express
const app = express();

// Middleware
app.use(cors()); // Cho phép Frontend (React) gọi API
app.use(express.json()); // Cho phép Backend đọc được dữ liệu JSON gửi lên

// Import file kết nối Database để test
const db = require('./src/config/db');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const posRoutes = require('./src/routes/posRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const payrollRoutes = require('./src/routes/payrollRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
// Một Route cơ bản để test
app.get('/', (req, res) => {
  res.send('Backend ERP Pet Shop đang chạy ngon lành!');
});
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
// Chạy server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại cổng http://localhost:${PORT}`);
});