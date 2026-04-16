const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Tìm tài khoản trong Database kèm thông tin Nhân viên và Vai trò
    const query = `
      SELECT tk.MANHANVIEN, tk.USERNAME, tk.PASSWORDHASH, tk.TRANG_THAI as TK_TRANGTHAI,
             nv.HOTEN, nv.TRANGTHAI as NV_TRANGTHAI,
             vt.MAVAITRO, vt.TENVAITRO, vt.QUYENHAN
      FROM TAI_KHOAN_NHAN_VIEN tk
      JOIN NHANVIEN nv ON tk.MANHANVIEN = nv.MANHANVIEN
      JOIN PHAN_QUYEN_NHAN_VIEN pq ON nv.MANHANVIEN = pq.MANHANVIEN
      JOIN VAI_TRO vt ON pq.MAVAITRO = vt.MAVAITRO
      WHERE tk.USERNAME = $1
    `;
    const result = await db.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập không tồn tại!' });
    }

    const user = result.rows[0];

    // 2. Kiểm tra trạng thái tài khoản và nhân viên
    if (!user.tk_trangthai || user.nv_trangthai !== 'Đang làm việc') {
      return res.status(403).json({ error: 'Tài khoản hoặc nhân viên đã bị khóa!' });
    }

    // 3. So sánh mật khẩu (Password người dùng nhập vs Hash trong Database)
    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác!' });
    }

    // 4. Tạo JWT Token (thẻ thông hành) chứa ID và Quyền hạn, hạn dùng 1 ngày
    const payload = {
      maNhanVien: user.manhanvien,
      hoTen: user.hoten,
      tenVaiTro: user.tenvaitro,
      quyenHan: user.quyenhan
    };

    // Lưu ý: Chuỗi bí mật 'my_super_secret_jwt_key' nên được đưa vào file .env sau này
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'my_super_secret_jwt_key', { 
        expiresIn: '1d' 
    });

    // 5. Trả về Token và thông tin cơ bản cho Frontend
    res.json({
      message: 'Đăng nhập thành công',
      token: token,
      user: payload
    });

  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const query = `
      SELECT nv.MANHANVIEN, nv.HOTEN, nv.SDT, nv.EMAIL, nv.TRANGTHAI, nv.NGAYVAOLAM,
             vt.MAVAITRO, vt.TENVAITRO, tk.USERNAME,
             hsl.MUCLUONG, hsl.SONGUOIPHUTHUOC
      FROM NHANVIEN nv
      JOIN TAI_KHOAN_NHAN_VIEN tk ON nv.MANHANVIEN = tk.MANHANVIEN
      JOIN PHAN_QUYEN_NHAN_VIEN pq ON nv.MANHANVIEN = pq.MANHANVIEN
      JOIN VAI_TRO vt ON pq.MAVAITRO = vt.MAVAITRO
      LEFT JOIN HO_SO_LUONG hsl ON nv.MANHANVIEN = hsl.MANHANVIEN
      ORDER BY nv.MANHANVIEN DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy danh sách nhân viên' });
  }
};

// Thêm hàm này vào dưới cùng của authController.js
exports.register = async (req, res) => {
  const { hoten, sdt, email, username, password, maVaiTro, mucLuong, soNguoiphuthuoc } = req.body;

  try {
    // 1. Tự động mã hóa mật khẩu ngay trong code
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Bắt đầu Transaction (Đảm bảo an toàn khi ghi vào nhiều bảng)
    await db.query('BEGIN');

    // Bước 2.1: Tạo thông tin nhân viên
    const insertNhanVienQuery = `
      INSERT INTO NHANVIEN (HOTEN, SDT, EMAIL, NGAYVAOLAM, TRANGTHAI) 
      VALUES ($1, $2, $3, CURRENT_DATE, 'Đang làm việc') RETURNING MANHANVIEN
    `;
    const nvResult = await db.query(insertNhanVienQuery, [hoten, sdt, email]);
    const maNhanVienMoi = nvResult.rows[0].manhanvien;

    // Bước 2.2: Tạo tài khoản với mật khẩu đã mã hóa
    const insertTaiKhoanQuery = `
      INSERT INTO TAI_KHOAN_NHAN_VIEN (MANHANVIEN, USERNAME, PASSWORDHASH) 
      VALUES ($1, $2, $3)
    `;
    await db.query(insertTaiKhoanQuery, [maNhanVienMoi, username, passwordHash]);

    // Bước 2.3: Phân quyền cho nhân viên đó
    const insertPhanQuyenQuery = `
      INSERT INTO PHAN_QUYEN_NHAN_VIEN (MAVAITRO, MANHANVIEN) 
      VALUES ($1, $2)
    `;
    await db.query(insertPhanQuyenQuery, [maVaiTro, maNhanVienMoi]);

    // Bước 2.4: Tạo hồ sơ lương cho nhân viên
    const insertHoSoLuongQuery = `
      INSERT INTO HO_SO_LUONG (MANHANVIEN, MUCLUONG, SONGUOIPHUTHUOC)
      VALUES ($1, $2, $3)
    `;
    await db.query(insertHoSoLuongQuery, [maNhanVienMoi, mucLuong, soNguoiphuthuoc]);

    // 3. Nếu mọi thứ suôn sẻ, lưu tất cả vào Database
    await db.query('COMMIT');

    res.status(201).json({ message: 'Tạo tài khoản nhân viên thành công!' });

  } catch (err) {
    // Nếu có lỗi ở bất kỳ bước nào, hủy bỏ toàn bộ thao tác
    await db.query('ROLLBACK');
    console.error("Lỗi tạo tài khoản:", err);
    
    // Bắt lỗi trùng username (Mã lỗi 23505 của PostgreSQL)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Tên đăng nhập này đã tồn tại!' });
    }
    res.status(500).json({ error: 'Lỗi server khi tạo nhân viên' });
  }
};

// Cập nhật thông tin nhân viên (bao gồm hồ sơ lương)
exports.updateEmployee = async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL
  const { hoten, sdt, email, maVaiTro, trangthai, mucLuong, soNguoiphuthuoc } = req.body;

  try {
    await db.query('BEGIN');

    // 1. Cập nhật thông tin cơ bản
    await db.query(
      `UPDATE NHANVIEN SET HOTEN = $1, SDT = $2, EMAIL = $3, TRANGTHAI = $4 WHERE MANHANVIEN = $5`,
      [hoten, sdt, email, trangthai, id]
    );

    // 2. Cập nhật vai trò
    await db.query(
      `UPDATE PHAN_QUYEN_NHAN_VIEN SET MAVAITRO = $1 WHERE MANHANVIEN = $2`,
      [maVaiTro, id]
    );

    // 3. Nếu trạng thái là 'Đã nghỉ việc', tự động khóa tài khoản
    if (trangthai === 'Đã nghỉ việc') {
      await db.query(`UPDATE TAI_KHOAN_NHAN_VIEN SET TRANG_THAI = false WHERE MANHANVIEN = $1`, [id]);
    } else {
      await db.query(`UPDATE TAI_KHOAN_NHAN_VIEN SET TRANG_THAI = true WHERE MANHANVIEN = $1`, [id]);
    }

    // 4. Cập nhật hồ sơ lương nếu client gửi mucLuong hoặc soNguoiphuthuoc
    if (typeof mucLuong !== 'undefined' || typeof soNguoiphuthuoc !== 'undefined') {
      const salaryRecord = await db.query(`SELECT MANHANVIEN FROM HO_SO_LUONG WHERE MANHANVIEN = $1`, [id]);
      const newMucLuong = typeof mucLuong !== 'undefined' ? mucLuong : null;
      const newSoNguoi = typeof soNguoiphuthuoc !== 'undefined' ? soNguoiphuthuoc : null;

      if (salaryRecord.rows.length > 0) {
        await db.query(
          `UPDATE HO_SO_LUONG SET MUCLUONG = COALESCE($1, MUCLUONG), SONGUOIPHUTHUOC = COALESCE($2, SONGUOIPHUTHUOC) WHERE MANHANVIEN = $3`,
          [newMucLuong, newSoNguoi, id]
        );
      } else {
        await db.query(
          `INSERT INTO HO_SO_LUONG (MANHANVIEN, MUCLUONG, SONGUOIPHUTHUOC) VALUES ($1, $2, $3)`,
          [id, newMucLuong, newSoNguoi]
        );
      }
    }

    await db.query('COMMIT');
    res.json({ message: 'Cập nhật thông tin thành công!' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Lỗi cập nhật nhân viên:", err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật' });
  }
};

// Xóa mềm nhân viên (Chuyển trạng thái)
exports.softDeleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');
    
    // Cập nhật trạng thái NV thành "Đã nghỉ việc"
    await db.query(`UPDATE NHANVIEN SET TRANGTHAI = 'Đã nghỉ việc' WHERE MANHANVIEN = $1`, [id]);
    
    // Khóa tài khoản
    await db.query(`UPDATE TAI_KHOAN_NHAN_VIEN SET TRANG_THAI = false WHERE MANHANVIEN = $1`, [id]);
    
    await db.query('COMMIT');
    res.json({ message: 'Đã chuyển nhân viên sang trạng thái Nghỉ việc!' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Lỗi xóa mềm:", err);
    res.status(500).json({ error: 'Lỗi server khi xóa mềm' });
  }
};