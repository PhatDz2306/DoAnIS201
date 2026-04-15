const db = require('../config/db');

// 1. Lấy danh sách tất cả sản phẩm
// Thay thế hàm này trong file: backend/src/controllers/productController.js
exports.getAllProducts = async (req, res) => {
  try {
    const query = `
      SELECT s.*, COALESCE(t.SOLUONGTON, 0) as SOLUONGTON 
      FROM SAN_PHAM s 
      LEFT JOIN TON_KHO t ON s.MASANPHAM = t.MASANPHAM 
      ORDER BY s.MASANPHAM DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};

// 2. Thêm sản phẩm mới (Thêm xử lý HINHANH)
exports.createProduct = async (req, res) => {
  const { tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan } = req.body;
  
  // Nếu có file upload lên, lấy link từ Cloudinary (req.file.path), nếu không thì để null
  const imgUrl = req.file ? req.file.path : null;

  try {
    const newProduct = await db.query(
      'INSERT INTO SAN_PHAM (TENSANPHAM, LOAISANPHAM, DONVITINH, GIANIEMYET, COTHEMUA, COTHEBAN, HINHANH) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan, imgUrl]
    );
    res.json(newProduct.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};

// 3. Cập nhật thông tin sản phẩm (Thêm xử lý HINHANH)
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan, hinhAnh } = req.body;
  
  // Nếu người dùng up ảnh mới -> lấy link mới (req.file.path)
  // Nếu KHÔNG up ảnh mới -> giữ lại link cũ được gửi từ frontend lên (hinhAnh)
  const imgUrl = req.file ? req.file.path : (hinhAnh && hinhAnh.trim() !== '' ? hinhAnh : null);

  try {
    const updatedProduct = await db.query(
      'UPDATE SAN_PHAM SET TENSANPHAM = $1, LOAISANPHAM = $2, DONVITINH = $3, GIANIEMYET = $4, COTHEMUA = $5, COTHEBAN = $6, HINHANH = $7 WHERE MASANPHAM = $8 RETURNING *',
      [tenSanPham, loaiSanPham, donViTinh, giaNiemYet, coTheMua, coTheBan, imgUrl, id]
    );
    res.json(updatedProduct.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Server' });
  }
};

// 4. "Xóa mềm" - Ngừng kinh doanh sản phẩm
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