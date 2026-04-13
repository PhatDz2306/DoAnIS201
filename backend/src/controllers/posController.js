const db = require('../config/db');

// 1. LẤY SẢN PHẨM (Có tìm kiếm Tên, Phân loại, Hình ảnh, kiểm tra Tồn kho)
exports.getPosProducts = async (req, res) => {
  const { keyword, loaiSanPham } = req.query;
  
  try {
    let query = `
      SELECT 
        s.MASANPHAM, s.TENSANPHAM, s.LOAISANPHAM, s.GIANIEMYET, s.HINHANH,
        COALESCE(t.SOLUONGTON, 0) as SOLUONGTON
      FROM SAN_PHAM s
      LEFT JOIN TON_KHO t ON s.MASANPHAM = t.MASANPHAM
      WHERE s.COTHEBAN = true
    `;
    let params = [];
    let paramIndex = 1;

    // Lọc theo từ khóa tìm kiếm (Tên sản phẩm)
    if (keyword) {
      query += ` AND s.TENSANPHAM ILIKE $${paramIndex}`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    // Lọc theo loại (Hàng hóa / Dịch vụ)
    if (loaiSanPham) {
      query += ` AND s.LOAISANPHAM = $${paramIndex}`;
      params.push(loaiSanPham);
      paramIndex++;
    }

    query += ` ORDER BY s.MASANPHAM DESC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi tải dữ liệu POS' });
  }
};

// 2. TÌM KHÁCH HÀNG BẰNG SỐ ĐIỆN THOẠI
exports.findCustomer = async (req, res) => {
  const { sdt } = req.query;
  try {
    const query = `
      SELECT d.MADOITAC, d.TENDOITAC, d.SODIENTHOAI, k.DIEMTICHLUY, k.LOAIKHACHHANG 
      FROM DOI_TAC d 
      JOIN KHACH_HANG k ON d.MADOITAC = k.MADOITAC 
      WHERE d.SODIENTHOAI = $1
    `;
    const result = await db.query(query, [sdt]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi tìm khách hàng' });
  }
};

// 3. HOLD ĐƠN HÀNG (Lưu tạm vào DON_HANG)
// 3. HOLD ĐƠN HÀNG (Lưu tạm hoặc Cập nhật đơn đang Hold)
exports.holdOrder = async (req, res) => {
  // Nhận thêm maDonHangHold từ Frontend
  const { maDoiTac, cartItems, tongTien, maDonHangHold } = req.body;
  if (!maDoiTac) return res.status(400).json({ error: 'Bắt buộc phải có khách hàng để Hold đơn!' });

  try {
    await db.query('BEGIN');
    let maDonHang = maDonHangHold;

    // KIỂM TRA: NẾU LÀ ĐƠN CŨ THÌ CẬP NHẬT, NẾU LÀ ĐƠN MỚI THÌ TẠO MỚI
    if (maDonHangHold) {
      // 1. Cập nhật lại tổng tiền và khách hàng (nhỡ họ đổi khách) của đơn cũ
      await db.query(
        `UPDATE DON_HANG SET TONGTIEN = $1, MADOITAC = $2 WHERE MADONHANG = $3`,
        [tongTien, maDoiTac, maDonHangHold]
      );
      
      // 2. Xóa sạch chi tiết đơn hàng cũ để chuẩn bị thêm giỏ hàng mới
      // (Cách này nhanh và sạch hơn việc ngồi đếm xem sản phẩm nào mới, sản phẩm nào cũ)
      await db.query(`DELETE FROM CHI_TIET_DON_HANG WHERE MADONHANG = $1`, [maDonHangHold]);
      
    } else {
      // Logic cũ: Tạo đơn mới hoàn toàn
      const donHangRes = await db.query(
        `INSERT INTO DON_HANG (MADOITAC, TONGTIEN, TRANGTHAI) VALUES ($1, $2, 'Hold') RETURNING MADONHANG`,
        [maDoiTac, tongTien]
      );
      maDonHang = donHangRes.rows[0].madonhang;
    }

    // 3. Insert lại toàn bộ chi tiết giỏ hàng hiện tại (Dùng chung cho cả 2 trường hợp)
    for (let item of cartItems) {
      await db.query(
        `INSERT INTO CHI_TIET_DON_HANG (MADONHANG, MASANPHAM, SOLUONG, DONGIA, THANHTIEN) 
         VALUES ($1, $2, $3, $4, $5)`,
        [maDonHang, item.masanpham, item.soluong, item.gianiemyet, item.soluong * item.gianiemyet]
      );
    }
    
    await db.query('COMMIT');
    res.json({ message: maDonHangHold ? 'Đã cập nhật đơn treo!' : 'Đã treo đơn thành công!', maDonHang });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi Hold đơn' });
  }
};

exports.getHoldOrders = async (req, res) => {
  try {
    const query = `
      SELECT d.MADONHANG, d.MADOITAC, d.NGAYTAO, d.TONGTIEN, dt.TENDOITAC, dt.SODIENTHOAI
      FROM DON_HANG d
      JOIN DOI_TAC dt ON d.MADOITAC = dt.MADOITAC
      WHERE d.TRANGTHAI = 'Hold'
      ORDER BY d.NGAYTAO DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách đơn Hold' });
  }
};

exports.getHoldOrderDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const details = await db.query(
      `SELECT c.*, s.TENSANPHAM, s.LOAISANPHAM, s.HINHANH 
       FROM CHI_TIET_DON_HANG c 
       JOIN SAN_PHAM s ON c.MASANPHAM = s.MASANPHAM 
       WHERE c.MADONHANG = $1`, [id]
    );
    res.json(details.rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy chi tiết đơn Hold' });
  }
};

// 4. HỦY ĐƠN HÀNG HOLD (Cancel)
exports.cancelHoldOrder = async (req, res) => {
  const { id } = req.params;
  try {
    // Nhờ ON DELETE CASCADE trong DB, xóa DON_HANG sẽ tự xóa CHI_TIET_DON_HANG
    await db.query(`DELETE FROM DON_HANG WHERE MADONHANG = $1`, [id]);
    res.json({ message: 'Đã hủy đơn hàng tạm!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Lỗi khi hủy đơn hàng' });
  }
};

// 5. THANH TOÁN (Tạo Hóa đơn, kiểm tra tồn kho, trừ tồn kho, tích điểm, xóa đơn Hold)
// 5. THANH TOÁN (Tạo Hóa đơn, kiểm tra tồn kho, trừ tồn kho, tích điểm, CẬP NHẬT đơn Hold)
exports.checkout = async (req, res) => {
  // Giữ nguyên các tên biến từ frontend của bạn
  const { maDoiTac, cartItems, tongTien, maDonHangHold } = req.body;

  try {
    await db.query('BEGIN'); // Bắt đầu Transaction

    // 1. Tạo hóa đơn (Ghi nhận doanh thu)
    const orderRes = await db.query(
      `INSERT INTO HOA_DON_BAN_HANG (MADOITAC, TONGTIEN, NGAYBAN) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING MAHOADON`,
      [maDoiTac || null, tongTien]
    );
    const maHoaDon = orderRes.rows[0].mahoadon;

    for (let item of cartItems) {
      // 2. Lưu chi tiết hóa đơn
      await db.query(
        `INSERT INTO CHI_TIET_HOA_DON (MAHOADON, MASANPHAM, SOLUONG, DONGIA, THANHTIEN) 
         VALUES ($1, $2, $3, $4, $5)`,
        [maHoaDon, item.masanpham, item.soluong, item.gianiemyet, item.soluong * item.gianiemyet]
      );

      // 3. XỬ LÝ TỒN KHO CỰC KỲ CHẶT CHẼ (Giữ nguyên logic bảo mật của bạn)
      if (item.loaisanpham === 'Hàng hóa') {
        
        // Bước 3.1: Khóa dòng dữ liệu để tránh tranh chấp (Race Condition)
        const stockCheck = await db.query(
          `SELECT SOLUONGTON FROM TON_KHO WHERE MASANPHAM = $1 FOR UPDATE`,
          [item.masanpham]
        );

        if (stockCheck.rows.length === 0) {
          throw { status: 400, message: `Sản phẩm ID ${item.masanpham} chưa được khởi tạo tồn kho!` };
        }

        const soLuongHienTai = stockCheck.rows[0].soluongton;

        // Bước 3.2: Kiểm tra kho
        if (soLuongHienTai < item.soluong) {
          throw { 
            status: 400, 
            message: `Sản phẩm "${item.tensanpham || item.masanpham}" chỉ còn ${soLuongHienTai} trong kho!` 
          };
        }

        // Bước 3.3: Trừ kho
        await db.query(
          `UPDATE TON_KHO SET SOLUONGTON = SOLUONGTON - $1 WHERE MASANPHAM = $2`,
          [item.soluong, item.masanpham]
        );
      }
    }

    // 4. Tích điểm cho khách hàng
    let diemCongThem = 0;
    if (maDoiTac) {
      diemCongThem = Math.floor(tongTien / 10000); 
      await db.query(
        `UPDATE KHACH_HANG SET DIEMTICHLUY = DIEMTICHLUY + $1 WHERE MADOITAC = $2`, 
        [diemCongThem, maDoiTac]
      );
    }

    // 5. THAY ĐỔI QUAN TRỌNG: Không DELETE mà UPDATE trạng thái đơn Hold
    if (maDonHangHold) {
      await db.query(
        `UPDATE DON_HANG SET TRANGTHAI = 'Hoàn thành' WHERE MADONHANG = $1`, 
        [maDonHangHold]
      );
      // Ghi chú: Chi tiết đơn hàng trong bảng DON_HANG_CHI_TIET vẫn còn nguyên, không bị mất.
    }

    // Mọi thứ hoàn hảo -> Lưu dữ liệu
    await db.query('COMMIT');
    res.json({ 
      success: true,
      message: `Thanh toán thành công! Khách hàng được cộng ${diemCongThem} điểm.` 
    });
    
  } catch (err) {
    await db.query('ROLLBACK');
    
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    
    console.error("Lỗi checkout:", err);
    res.status(500).json({ error: 'Lỗi hệ thống khi thanh toán' });
  }
};