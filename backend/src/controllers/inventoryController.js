const db = require('../config/db');

// 1. Xem danh sách tồn kho (Cập nhật: Lấy thêm Hình ảnh và Loại sản phẩm)
// Thay thế hàm này trong file: backend/src/controllers/inventoryController.js
exports.getInventory = async (req, res) => {
  try {
    const query = `
      SELECT s.MASANPHAM, s.TENSANPHAM, s.LOAISANPHAM, s.DONVITINH, s.GIANIEMYET, s.HINHANH, s.COTHEMUA, 
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

// 3. Kiểm kê kho (Tạo phiếu kiểm kê & Cập nhật tồn kho)
exports.createInventoryCheck = async (req, res) => {
  const { items } = req.body;
  const maNhanVien = req.user ? req.user.maNhanVien : null;

  try {
    await db.query('BEGIN');

    // 1. Tạo phiếu kiểm kê
    const kiemKeResult = await db.query(
      `INSERT INTO KIEM_KE (NGUOIKIEMKE) VALUES ($1) RETURNING MAKIEMKE`,
      [maNhanVien]
    );
    const maKiemKe = kiemKeResult.rows[0].makiemke;

    for (let item of items) {
      // 2. Lấy số lượng hệ thống hiện tại
      const tonKhoResult = await db.query(
        `SELECT SOLUONGTON FROM TON_KHO WHERE MASANPHAM = $1`,
        [item.masanpham]
      );
      const slHeThong = tonKhoResult.rows.length > 0 ? tonKhoResult.rows[0].soluongton : 0;
      const slThucTe = parseInt(item.slthucte);
      const slLech = slThucTe - slHeThong;

      // 3. Thêm chi tiết kiểm kê
      await db.query(
        `INSERT INTO CHI_TIET_KIEM_KE (MAKIEMKE, MASANPHAM, SLHETHONG, SLTHUCTE, SLLECH, LYDOLECH) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [maKiemKe, item.masanpham, slHeThong, slThucTe, slLech, item.lydolech]
      );

      // 4. Cập nhật lại tồn kho thực tế
      await db.query(
        `INSERT INTO TON_KHO (MASANPHAM, SOLUONGTON) 
         VALUES ($1, $2) 
         ON CONFLICT (MASANPHAM) 
         DO UPDATE SET SOLUONGTON = EXCLUDED.SOLUONGTON`,
        [item.masanpham, slThucTe]
      );
    }

    await db.query('COMMIT');
    res.json({ message: 'Kiểm kê kho thành công!', maKiemKe });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi khi thực hiện kiểm kê' });
  }
};
