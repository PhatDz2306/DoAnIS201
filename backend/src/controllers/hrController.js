const db = require('../config/db');
const bcrypt = require('bcrypt');

// Employee management (moved from authController.js)
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

exports.register = async (req, res) => {
  const { hoten, sdt, email, username, password, maVaiTro } = req.body;

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await db.query('BEGIN');

    const insertNhanVienQuery = `
      INSERT INTO NHANVIEN (HOTEN, SDT, EMAIL, NGAYVAOLAM, TRANGTHAI) 
      VALUES ($1, $2, $3, CURRENT_DATE, 'Đang làm việc') RETURNING MANHANVIEN
    `;
    const nvResult = await db.query(insertNhanVienQuery, [hoten, sdt, email]);
    const maNhanVienMoi = nvResult.rows[0].manhanvien;

    const insertTaiKhoanQuery = `
      INSERT INTO TAI_KHOAN_NHAN_VIEN (MANHANVIEN, USERNAME, PASSWORDHASH) 
      VALUES ($1, $2, $3)
    `;
    await db.query(insertTaiKhoanQuery, [maNhanVienMoi, username, passwordHash]);

    const insertPhanQuyenQuery = `
      INSERT INTO PHAN_QUYEN_NHAN_VIEN (MAVAITRO, MANHANVIEN) 
      VALUES ($1, $2)
    `;
    await db.query(insertPhanQuyenQuery, [maVaiTro, maNhanVienMoi]);

    // NOTE: Do not create HO_SO_LUONG here. Salary profile managed in payroll module.

    await db.query('COMMIT');
    res.status(201).json({ message: 'Tạo tài khoản nhân viên thành công!' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Lỗi tạo tài khoản:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Tên đăng nhập này đã tồn tại!' });
    }
    res.status(500).json({ error: 'Lỗi server khi tạo nhân viên' });
  }
};

exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { hoten, sdt, email, maVaiTro, trangthai } = req.body;

  try {
    await db.query('BEGIN');
    await db.query(
      `UPDATE NHANVIEN SET HOTEN = $1, SDT = $2, EMAIL = $3, TRANGTHAI = $4 WHERE MANHANVIEN = $5`,
      [hoten, sdt, email, trangthai, id]
    );

    await db.query(
      `UPDATE PHAN_QUYEN_NHAN_VIEN SET MAVAITRO = $1 WHERE MANHANVIEN = $2`,
      [maVaiTro, id]
    );

    if (trangthai === 'Đã nghỉ việc') {
      await db.query(`UPDATE TAI_KHOAN_NHAN_VIEN SET TRANG_THAI = false WHERE MANHANVIEN = $1`, [id]);
    } else {
      await db.query(`UPDATE TAI_KHOAN_NHAN_VIEN SET TRANG_THAI = true WHERE MANHANVIEN = $1`, [id]);
    }

    // NOTE: Salary profile updates are handled in payrollController.

    await db.query('COMMIT');
    res.json({ message: 'Cập nhật thông tin thành công!' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Lỗi cập nhật nhân viên:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật' });
  }
};

exports.softDeleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');
    await db.query(`UPDATE NHANVIEN SET TRANGTHAI = 'Đã nghỉ việc' WHERE MANHANVIEN = $1`, [id]);
    await db.query(`UPDATE TAI_KHOAN_NHAN_VIEN SET TRANG_THAI = false WHERE MANHANVIEN = $1`, [id]);
    await db.query('COMMIT');
    res.json({ message: 'Đã chuyển nhân viên sang trạng thái Nghỉ việc!' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Lỗi xóa mềm:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa mềm' });
  }
};

// Leave management (moved from attendanceController.js)
function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

exports.createLeave = async (req, res) => {
  const ma = req.user && req.user.maNhanVien;
  if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });
  const { fromDate, toDate, lydo } = req.body;
  if (!fromDate || !toDate) return res.status(400).json({ error: 'Thiếu ngày bắt đầu hoặc kết thúc' });

  try {
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const soday = Math.round((d2.setHours(0,0,0,0) - d1.setHours(0,0,0,0)) / msPerDay) + 1;

    const insert = await db.query('INSERT INTO DON_NGHI_PHEP (MANHANVIEN, NGAY_BATDAU, NGAY_KETTHUC, SODAY, LYDO, TRANGTHAI, NGAYTAO) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *', [ma, fromDate, toDate, soday, lydo || '', 'Chờ duyệt']);
    const qRes = await db.query('SELECT * FROM QUAN_LY_PHEP WHERE MANHANVIEN = $1', [ma]);
    if (qRes.rows.length === 0) {
      await db.query('INSERT INTO QUAN_LY_PHEP (MANHANVIEN, TONGPHEP, CONLAI, NGAYCAPNHAT) VALUES ($1, $2, $3, CURRENT_DATE)', [ma, 12, 12]);
    }

    res.json({ success: true, request: insert.rows[0] });
  } catch (err) {
    console.error('createLeave error:', err);
    res.status(500).json({ error: 'Lỗi server khi tạo đơn nghỉ phép' });
  }
};

exports.getMyLeaves = async (req, res) => {
  const ma = req.user && req.user.maNhanVien;
  if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });
  try {
    const r = await db.query('SELECT * FROM DON_NGHI_PHEP WHERE MANHANVIEN = $1 ORDER BY NGAYTAO DESC', [ma]);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('getMyLeaves error:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy đơn nghỉ của bạn' });
  }
};

exports.getLeaveBalance = async (req, res) => {
  const ma = req.user && req.user.maNhanVien;
  if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });
  try {
    const r = await db.query('SELECT * FROM QUAN_LY_PHEP WHERE MANHANVIEN = $1', [ma]);
    if (r.rows.length === 0) return res.json({ success: true, data: { tongphep: 12, conlai: 12 } });
    const row = r.rows[0];
    res.json({ success: true, data: { tongphep: Number(row.tongphep), conlai: Number(row.conlai) } });
  } catch (err) {
    console.error('getLeaveBalance error:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy thông tin phép' });
  }
};

exports.getPendingLeaves = async (req, res) => {
  try {
    const r = await db.query("SELECT d.*, n.HOTEN as HOTEN_NHANVIEN FROM DON_NGHI_PHEP d LEFT JOIN NHANVIEN n ON d.MANHANVIEN = n.MANHANVIEN WHERE d.TRANGTHAI = 'Chờ duyệt' ORDER BY d.NGAYTAO ASC");
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('getPendingLeaves error:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy đơn chờ duyệt' });
  }
};

exports.approveLeave = async (req, res) => {
  const approver = req.user && req.user.maNhanVien;
  const id = req.params.id;
  try {
    const r = await db.query('SELECT * FROM DON_NGHI_PHEP WHERE MADON = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Đơn không tồn tại' });
    const leave = r.rows[0];
    if (leave.trangthai !== 'Chờ duyệt') return res.status(400).json({ error: 'Đơn đã được xử lý' });

    await db.query('BEGIN');
    await db.query('UPDATE DON_NGHI_PHEP SET TRANGTHAI = $1, NGUOIDUYET = $2, NGAYDUYET = NOW() WHERE MADON = $3', ['Đã duyệt', approver, id]);

    const qRes = await db.query('SELECT * FROM QUAN_LY_PHEP WHERE MANHANVIEN = $1 FOR UPDATE', [leave.manhanvien]);
    if (qRes.rows.length === 0) {
      await db.query('INSERT INTO QUAN_LY_PHEP (MANHANVIEN, TONGPHEP, CONLAI, NGAYCAPNHAT) VALUES ($1, $2, $3, CURRENT_DATE)', [leave.manhanvien, 12, Math.max(0, 12 - leave.soday)]);
    } else {
      const cur = qRes.rows[0];
      const newConLai = Math.max(0, Number(cur.conlai) - Number(leave.soday));
      await db.query('UPDATE QUAN_LY_PHEP SET CONLAI = $1, NGAYCAPNHAT = CURRENT_DATE WHERE MANHANVIEN = $2', [newConLai, leave.manhanvien]);
    }

    try {
      const start = new Date(leave.ngay_batdau);
      const end = new Date(leave.ngay_ketthuc);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatLocalDate(new Date(d));
        const ghiChuText = `Nghỉ phép: ${leave.lydo || ''}`;
        const chRes = await db.query('SELECT * FROM CHAM_CONG WHERE MANHANVIEN = $1 AND NGAY = $2 FOR UPDATE', [leave.manhanvien, dateStr]);
        if (chRes.rows.length > 0) {
          const existing = chRes.rows[0];
          await db.query('UPDATE CHAM_CONG SET GIOVAO = NULL, GIORA = NULL, SOGIOLAM = 0, TANGCA = 0, GHICHU = $1 WHERE MACHAMCONG = $2', [ghiChuText, existing.machamcong]);
        } else {
          await db.query('INSERT INTO CHAM_CONG (MANHANVIEN, NGAY, GIOVAO, GIORA, SOGIOLAM, TANGCA, GHICHU) VALUES ($1,$2,NULL,NULL,0,0,$3)', [leave.manhanvien, dateStr, ghiChuText]);
        }
      }
    } catch (e) {
      console.error('approveLeave - mark CHAM_CONG as leave error:', e);
    }

    await db.query('COMMIT');
    res.json({ success: true, message: 'Đã duyệt đơn nghỉ phép' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('approveLeave error:', err);
    res.status(500).json({ error: 'Lỗi server khi duyệt đơn' });
  }
};

exports.rejectLeave = async (req, res) => {
  const approver = req.user && req.user.maNhanVien;
  const id = req.params.id;
  const { reason } = req.body;
  try {
    const r = await db.query('SELECT * FROM DON_NGHI_PHEP WHERE MADON = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Đơn không tồn tại' });
    const leave = r.rows[0];
    if (leave.trangthai !== 'Chờ duyệt') return res.status(400).json({ error: 'Đơn đã được xử lý' });

    await db.query('UPDATE DON_NGHI_PHEP SET TRANGTHAI = $1, NGUOIDUYET = $2, NGAYDUYET = NOW(), LYDO = COALESCE(LYDO, $3) WHERE MADON = $4', ['Từ chối', approver, reason || leave.lydo, id]);
    res.json({ success: true, message: 'Đã từ chối đơn nghỉ phép' });
  } catch (err) {
    console.error('rejectLeave error:', err);
    res.status(500).json({ error: 'Lỗi server khi từ chối đơn' });
  }
};

// GET /api/hr/employees/weekly-attendance?start=YYYY-MM-DD
exports.getEmployeesWeeklyAttendance = async (req, res) => {
  try {
    // Determine week start (Monday). If start provided, use it; else compute current week's Monday.
    let startParam = req.query.start;
    let startDate = startParam ? new Date(startParam) : new Date();
    // Normalize to local midnight
    startDate.setHours(0,0,0,0);
    const day = startDate.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMon = (day + 6) % 7; // days since Monday
    startDate.setDate(startDate.getDate() - diffToMon);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(formatLocalDate(d));
    }
    const startStr = dates[0];
    const endStr = dates[6];

    // Fetch active employees
    const empRes = await db.query('SELECT MANHANVIEN, HOTEN FROM NHANVIEN WHERE TRANGTHAI = $1 ORDER BY MANHANVIEN', ['Đang làm việc']);

    // Fetch attendance records for that week
    const chRes = await db.query('SELECT MANHANVIEN, NGAY, GIOVAO, GIORA, SOGIOLAM FROM CHAM_CONG WHERE NGAY BETWEEN $1 AND $2', [startStr, endStr]);

    const attMap = {};
    for (const r of chRes.rows) {
      const man = r.manhanvien;
      const dateKey = formatLocalDate(new Date(r.ngay));
      if (!attMap[man]) attMap[man] = {};
      const present = (r.giovao !== null) || (r.giora !== null) || (r.sogiolam && Number(r.sogiolam) > 0);
      attMap[man][dateKey] = !!present;
    }

    const data = empRes.rows.map(emp => {
      const obj = { manhanvien: emp.manhanvien, hoten: emp.hoten, attendance: {} };
      for (const d of dates) {
        obj.attendance[d] = attMap[emp.manhanvien] && attMap[emp.manhanvien][d] ? true : false;
      }
      return obj;
    });

    res.json({ success: true, start: startStr, end: endStr, days: dates, data });
  } catch (err) {
    console.error('getEmployeesWeeklyAttendance error:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy chấm công tuần' });
  }
};
