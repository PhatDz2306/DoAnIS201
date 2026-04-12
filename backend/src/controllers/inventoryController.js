const db = require('../config/db');

// 1. Xem danh sách tồn kho (Chỉ lấy Sản phẩm loại 'Hàng hóa')
exports.getInventory = async (req, res) => {
  try {
    const query = `
      SELECT s.MASANPHAM, s.TENSANPHAM, s.DONVITINH, s.GIANIEMYET, COALESCE(t.SOLUONGTON, 0) as SOLUONGTON 
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
  const { items } = req.body; // items là mảng các { masanpham, soluong, dongia }
  
  // Tạo mã phiếu nhập tự động (VD: PN-1698765432)
  const soPhieu = `PN-${Date.now()}`; 

  try {
    // Trong thực tế sẽ dùng Transaction, ở đây ta chạy tuần tự cho dễ hiểu
    // 1. Lưu vào bảng PHIEU_KHO (Tạm thời để NGUOIPHUTRACH = null vì chưa có Login)
    await db.query(
      `INSERT INTO PHIEU_KHO (SOPHIEU, LOAIPHIEU) VALUES ($1, 'Nhập')`,
      [soPhieu]
    );

    for (let item of items) {
      // 2. Lưu vào bảng CHI_TIET_PHIEU
      await db.query(
        `INSERT INTO CHI_TIET_PHIEU (SOPHIEU, MASANPHAM, SOLUONG, DONGIA) VALUES ($1, $2, $3, $4)`,
        [soPhieu, item.masanpham, item.soluong, item.dongia]
      );

      // 3. Cập nhật bảng TON_KHO (Nếu có rồi thì cộng dồn, chưa có thì Insert mới)
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