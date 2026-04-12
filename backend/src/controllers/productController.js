const db = require('../config/db');

// 1. Lấy danh sách tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM SAN_PHAM ORDER BY MASANPHAM DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};

// 2. Thêm sản phẩm mới
exports.createProduct = async (req, res) => {
  const { tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan } = req.body;
  try {
    const newProduct = await db.query(
      'INSERT INTO SAN_PHAM (TENSANPHAM, LOAISANPHAM, DONVITINH, GIANIEMYET, COTHEMUA, COTHEBAN) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan]
    );
    res.json(newProduct.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};

// 3. Cập nhật thông tin sản phẩm (Sửa tên, giá...)
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan } = req.body;
  try {
    const updatedProduct = await db.query(
      'UPDATE SAN_PHAM SET TENSANPHAM = $1, LOAISANPHAM = $2, DONVITINH = $3, GIANIEMYET = $4, COTHEMUA = $5, COTHEBAN = $6 WHERE MASANPHAM = $7 RETURNING *',
      [tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan, id]
    );
    res.json(updatedProduct.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};

// 4. "Xóa mềm" - Ngừng kinh doanh sản phẩm
// Giữ nguyên Data trong DB, chỉ chuyển trạng thái thành false
exports.deactivateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const deactivatedProduct = await db.query(
      'UPDATE SAN_PHAM SET COTHEMUA = false, COTHEBAN = false WHERE MASANPHAM = $1 RETURNING *',
      [id]
    );
    res.json({ 
      message: 'Đã ngừng kinh doanh sản phẩm này!', 
      product: deactivatedProduct.rows[0] 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};