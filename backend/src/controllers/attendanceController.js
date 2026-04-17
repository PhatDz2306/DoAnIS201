const db = require('../config/db');

// Helper: compute SOGIOLAM and TANGCA given giovao and giora (JS Date)
function computeHours(giovao, giora) {
  if (!giovao || !giora) return { sogiolam: 0, tangca: 0 };

  const msPerHour = 1000 * 60 * 60;
  let totalHours = (giora.getTime() - giovao.getTime()) / msPerHour;
  if (totalHours < 0) totalHours = 0;

  // If worked across lunch (before 12:00 and after 13:00), subtract 1 hour
  const crossedLunch = (giovao.getHours() < 12) && (giora.getHours() >= 13);
  if (crossedLunch) totalHours = Math.max(0, totalHours - 1);

  // Base work hours capped at 8
  const sogiolam = Math.round(Math.max(0, Math.min(8, totalHours)) * 100) / 100;

  // Overtime = hours after 17:00
  const overtimeBaseline = new Date(giora);
  overtimeBaseline.setHours(17, 0, 0, 0);
  const rawOver = (giora.getTime() - overtimeBaseline.getTime()) / msPerHour;
  const tangca = Math.round(Math.max(0, rawOver) * 100) / 100;

  return { sogiolam, tangca };
}

function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = {
  // POST /api/attendance/check-in
  checkIn: async (req, res) => {
    const ma = req.user && req.user.maNhanVien;
    if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });

    try {
      // Prevent check-in if there's an approved leave covering today
      const now = new Date();
      const localDate = formatLocalDate(now);
      const leaveCheck = await db.query("SELECT * FROM DON_NGHI_PHEP WHERE MANHANVIEN = $1 AND TRANGTHAI = 'Đã duyệt' AND NGAY_BATDAU <= $2 AND NGAY_KETTHUC >= $2", [ma, localDate]);
      if (leaveCheck.rows.length > 0) return res.status(400).json({ error: 'Bạn đang có đơn nghỉ phép đã được duyệt hôm nay' });

      // Use server JS time (consistent) and local date string to avoid TZ mismatches
      const existing = await db.query('SELECT * FROM CHAM_CONG WHERE MANHANVIEN = $1 AND NGAY = $2', [ma, localDate]);
      if (existing.rows.length > 0) {
        const rec = existing.rows[0];
        if (rec.giovao) return res.status(400).json({ error: 'Bạn đã check-in hôm nay' });
        const upd = await db.query('UPDATE CHAM_CONG SET GIOVAO = $1 WHERE MACHAMCONG = $2 RETURNING *', [now, rec.machamcong]);
        return res.json({ success: true, record: upd.rows[0] });
      }

      const insert = await db.query('INSERT INTO CHAM_CONG (MANHANVIEN, NGAY, GIOVAO) VALUES ($1, $2, $3) RETURNING *', [ma, localDate, now]);
      res.json({ success: true, record: insert.rows[0] });
    } catch (err) {
      console.error('checkIn error:', err);
      res.status(500).json({ error: 'Lỗi server khi check-in' });
    }
  },

  // POST /api/attendance/check-out
  checkOut: async (req, res) => {
    const ma = req.user && req.user.maNhanVien;
    if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });

    try {
      const now = new Date();
      const localDate = formatLocalDate(now);

      const existing = await db.query('SELECT * FROM CHAM_CONG WHERE MANHANVIEN = $1 AND NGAY = $2', [ma, localDate]);
      if (existing.rows.length === 0) return res.status(400).json({ error: 'Không tìm thấy bản ghi check-in hôm nay' });
      const rec = existing.rows[0];
      if (!rec.giovao) return res.status(400).json({ error: 'Bạn chưa check-in hôm nay' });
      if (rec.giora) return res.status(400).json({ error: 'Bạn đã check-out rồi' });

      const giovao = new Date(rec.giovao);
      const giora = now;
      const { sogiolam, tangca } = computeHours(giovao, giora);

      const upd = await db.query('UPDATE CHAM_CONG SET GIORA = $1, SOGIOLAM = $2, TANGCA = $3 WHERE MACHAMCONG = $4 RETURNING *', [giora, sogiolam, tangca, rec.machamcong]);
      res.json({ success: true, record: upd.rows[0] });
    } catch (err) {
      console.error('checkOut error:', err);
      res.status(500).json({ error: 'Lỗi server khi check-out' });
    }
  },

  // GET /api/attendance/my-records?thangnam=MM/YYYY
  getMyRecords: async (req, res) => {
    const ma = req.user && req.user.maNhanVien;
    if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });

    const thangnam = req.query.thangnam;
    try {
      let rows;
      if (thangnam) {
        const [mm, yyyy] = thangnam.split('/').map(Number);
        const start = new Date(yyyy, mm - 1, 1);
        const end = new Date(yyyy, mm, 0);
        const startStr = formatLocalDate(start);
        const endStr = formatLocalDate(end);
        rows = await db.query('SELECT * FROM CHAM_CONG WHERE MANHANVIEN = $1 AND NGAY BETWEEN $2 AND $3 ORDER BY NGAY DESC', [ma, startStr, endStr]);
      } else {
        rows = await db.query('SELECT * FROM CHAM_CONG WHERE MANHANVIEN = $1 ORDER BY NGAY DESC LIMIT 100', [ma]);
      }
      res.json({ success: true, data: rows.rows });
    } catch (err) {
      console.error('getMyRecords error:', err);
      res.status(500).json({ error: 'Lỗi server khi lấy bảng công' });
    }
  },

  // GET /api/attendance/all-records?thangnam=MM/YYYY  (Admin/Manager)
  getAllRecords: async (req, res) => {
    try {
      const thangnam = req.query.thangnam;
      let rows;
      if (thangnam) {
        const [mm, yyyy] = thangnam.split('/').map(Number);
        const start = new Date(yyyy, mm - 1, 1);
        const end = new Date(yyyy, mm, 0);
        const startStr = formatLocalDate(start);
        const endStr = formatLocalDate(end);
        rows = await db.query('SELECT * FROM CHAM_CONG WHERE NGAY BETWEEN $1 AND $2 ORDER BY NGAY DESC', [startStr, endStr]);
      } else {
        rows = await db.query('SELECT * FROM CHAM_CONG ORDER BY NGAY DESC LIMIT 100');
      }
      res.json({ success: true, data: rows.rows });
    } catch (err) {
      console.error('getAllRecords error:', err);
      res.status(500).json({ error: 'Lỗi server khi lấy bảng công toàn công ty' });
    }
  },

  // PUT /api/attendance/edit/:id  (Admin/Manager) - chỉnh sửa công thủ công
  editRecord: async (req, res) => {
    const id = req.params.id;
    const { giovao: gvBody, giora: grBody, ghichu, lydo } = req.body; // expect ISO strings if provided; lydo = reason for edit
    try {
      const recR = await db.query('SELECT * FROM CHAM_CONG WHERE MACHAMCONG = $1', [id]);
      if (recR.rows.length === 0) return res.status(404).json({ error: 'Bản ghi không tồn tại' });
      const rec = recR.rows[0];

      const giovao = gvBody ? new Date(gvBody) : (rec.giovao ? new Date(rec.giovao) : null);
      const giora = grBody ? new Date(grBody) : (rec.giora ? new Date(rec.giora) : null);

      const { sogiolam, tangca } = computeHours(giovao, giora);

      // Insert history record before updating
      await db.query(
        `INSERT INTO CHAM_CONG_SUA_LICH_SU (MACHAMCONG, NGUOISUA, GIOVAO_CU, GIOVAO_MOI, GIORA_CU, GIORA_MOI, SOGIOLAM_CU, SOGIOLAM_MOI, TANGCA_CU, TANGCA_MOI, LYDO)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)` ,
        [id, req.user.maNhanVien, rec.giovao, giovao, rec.giora, giora, rec.sogiolam, sogiolam, rec.tangca, tangca, lydo || null]
      );

      const upd = await db.query('UPDATE CHAM_CONG SET GIOVAO = $1, GIORA = $2, SOGIOLAM = $3, TANGCA = $4, GHICHU = COALESCE($5, GHICHU) WHERE MACHAMCONG = $6 RETURNING *', [giovao, giora, sogiolam, tangca, ghichu, id]);
      res.json({ success: true, record: upd.rows[0] });
    } catch (err) {
      console.error('editRecord error:', err);
      res.status(500).json({ error: 'Lỗi server khi chỉnh sửa bảng công' });
    }
  },

  // ======== Leave management ========
  // POST /api/attendance/leaves  (create leave request by employee)
  createLeave: async (req, res) => {
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
      // Ensure QUAN_LY_PHEP exists for this employee
      const qRes = await db.query('SELECT * FROM QUAN_LY_PHEP WHERE MANHANVIEN = $1', [ma]);
      if (qRes.rows.length === 0) {
        await db.query('INSERT INTO QUAN_LY_PHEP (MANHANVIEN, TONGPHEP, CONLAI, NGAYCAPNHAT) VALUES ($1, $2, $3, CURRENT_DATE)', [ma, 12, 12]);
      }

      res.json({ success: true, request: insert.rows[0] });
    } catch (err) {
      console.error('createLeave error:', err);
      res.status(500).json({ error: 'Lỗi server khi tạo đơn nghỉ phép' });
    }
  },

  // GET /api/attendance/my-leaves
  getMyLeaves: async (req, res) => {
    const ma = req.user && req.user.maNhanVien;
    if (!ma) return res.status(400).json({ error: 'Không xác định nhân viên từ token' });
    try {
      const r = await db.query('SELECT * FROM DON_NGHI_PHEP WHERE MANHANVIEN = $1 ORDER BY NGAYTAO DESC', [ma]);
      res.json({ success: true, data: r.rows });
    } catch (err) {
      console.error('getMyLeaves error:', err);
      res.status(500).json({ error: 'Lỗi server khi lấy đơn nghỉ của bạn' });
    }
  },

  // GET /api/attendance/leave-balance
  getLeaveBalance: async (req, res) => {
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
  },


  // GET /api/attendance/leaves/pending  (Admin/Manager)
  getPendingLeaves: async (req, res) => {
    try {
      const r = await db.query("SELECT d.*, n.HOTEN as HOTEN_NHANVIEN FROM DON_NGHI_PHEP d LEFT JOIN NHANVIEN n ON d.MANHANVIEN = n.MANHANVIEN WHERE d.TRANGTHAI = 'Chờ duyệt' ORDER BY d.NGAYTAO ASC");
      res.json({ success: true, data: r.rows });
    } catch (err) {
      console.error('getPendingLeaves error:', err);
      res.status(500).json({ error: 'Lỗi server khi lấy đơn chờ duyệt' });
    }
  },

  // GET /api/attendance/history/:id  (Admin/Manager)
  getEditHistory: async (req, res) => {
    const id = req.params.id;
    try {
      const r = await db.query(`SELECT s.*, n.hoten as nguoisua_hoten FROM CHAM_CONG_SUA_LICH_SU s LEFT JOIN NHANVIEN n ON s.nguoisua = n.manhanvien WHERE s.machamcong = $1 ORDER BY s.ngaysua DESC`, [id]);
      res.json({ success: true, data: r.rows });
    } catch (err) {
      console.error('getEditHistory error:', err);
      res.status(500).json({ error: 'Lỗi server khi lấy lịch sử sửa' });
    }
  },

  // PUT /api/attendance/leaves/:id/approve  (Admin/Manager)
  approveLeave: async (req, res) => {
    const approver = req.user && req.user.maNhanVien;
    const id = req.params.id;
    try {
      const r = await db.query('SELECT * FROM DON_NGHI_PHEP WHERE MADON = $1', [id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Đơn không tồn tại' });
      const leave = r.rows[0];
      if (leave.trangthai !== 'Chờ duyệt') return res.status(400).json({ error: 'Đơn đã được xử lý' });

      await db.query('BEGIN');
      await db.query('UPDATE DON_NGHI_PHEP SET TRANGTHAI = $1, NGUOIDUYET = $2, NGAYDUYET = NOW() WHERE MADON = $3', ['Đã duyệt', approver, id]);

      // Deduct from QUAN_LY_PHEP
      const qRes = await db.query('SELECT * FROM QUAN_LY_PHEP WHERE MANHANVIEN = $1 FOR UPDATE', [leave.manhanvien]);
      if (qRes.rows.length === 0) {
        // initialize with default 12 days
        await db.query('INSERT INTO QUAN_LY_PHEP (MANHANVIEN, TONGPHEP, CONLAI, NGAYCAPNHAT) VALUES ($1, $2, $3, CURRENT_DATE)', [leave.manhanvien, 12, Math.max(0, 12 - leave.soday)]);
      } else {
        const cur = qRes.rows[0];
        const newConLai = Math.max(0, Number(cur.conlai) - Number(leave.soday));
        await db.query('UPDATE QUAN_LY_PHEP SET CONLAI = $1, NGAYCAPNHAT = CURRENT_DATE WHERE MANHANVIEN = $2', [newConLai, leave.manhanvien]);
      }

      // For each day in the approved leave, create/update CHAM_CONG entry to mark as leave
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
        // non-fatal for leave creation, but log it
        console.error('approveLeave - mark CHAM_CONG as leave error:', e);
      }

      await db.query('COMMIT');
      res.json({ success: true, message: 'Đã duyệt đơn nghỉ phép' });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error('approveLeave error:', err);
      res.status(500).json({ error: 'Lỗi server khi duyệt đơn' });
    }
  },

  // PUT /api/attendance/leaves/:id/reject  (Admin/Manager)
  rejectLeave: async (req, res) => {
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
  }
};
