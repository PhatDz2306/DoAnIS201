const db = require('../config/db');

// 1. Xem danh sách tồn kho (Cập nhật: Lấy thêm Hình ảnh và Loại sản phẩm)
exports.getInventory = async (req, res) => {
  try {
    const query = `
      SELECT s.MASANPHAM, s.TENSANPHAM, s.LOAISANPHAM, s.DONVITINH, s.GIANIEMYET, s.HINHANH, 
             COALESCE(t.SOLUONGTON, 0) as SOLUONGTON 
      FROM SAN_PHAM s 
      LEFT JOIN TON_KHO t ON s.MASANPHAM = t.MASANPHAM 
      WHERE s.LOAISANPHAM = 'Hàng hóa' 
      ORDER BY s.MASANPHAM DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi lấy dữ liệu kho' });
  }
};

// 2. Nhập kho (Tạo phiếu nhập & Cập nhật tồn kho)
exports.importStock = async (req, res) => {
  const { items } = req.body; 
  const soPhieu = `PN-${Date.now()}`; 

  try {
    await db.query(`INSERT INTO PHIEU_KHO (SOPHIEU, LOAIPHIEU) VALUES ($1, 'Nhập')`, [soPhieu]);

    for (let item of items) {
      await db.query(
        `INSERT INTO CHI_TIET_PHIEU (SOPHIEU, MASANPHAM, SOLUONG, DONGIA) VALUES ($1, $2, $3, $4)`,
        [soPhieu, item.masanpham, item.soluong, item.dongia]
      );

      await db.query(
        `INSERT INTO TON_KHO (MASANPHAM, SOLUONGTON) 
         VALUES ($1, $2) 
         ON CONFLICT (MASANPHAM) 
         DO UPDATE SET SOLUONGTON = TON_KHO.SOLUONGTON + EXCLUDED.SOLUONGTON`,
        [item.masanpham, item.soluong]
      );
    }

    res.json({ message: 'Nhập kho thành công!', soPhieu });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi khi nhập kho' });
  }
};