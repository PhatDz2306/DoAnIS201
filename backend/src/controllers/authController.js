const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
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

    if (!user.tk_trangthai || user.nv_trangthai !== 'Đang làm việc') {
      return res.status(403).json({ error: 'Tài khoản hoặc nhân viên đã bị khóa!' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác!' });
    }

    const payload = {
      maNhanVien: user.manhanvien,
      hoTen: user.hoten,
      tenVaiTro: user.tenvaitro,
      quyenHan: user.quyenhan
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'my_super_secret_jwt_key', { expiresIn: '1d' });

    res.json({ message: 'Đăng nhập thành công', token, user: payload });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
};