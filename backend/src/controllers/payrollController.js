const db = require('../config/db');

function formatMonthYear(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${yyyy}`;
}

const TAX_BRACKETS = [
  { cap: 5000000, rate: 0.05 },
  { cap: 10000000, rate: 0.10 },
  { cap: 18000000, rate: 0.15 },
  { cap: 32000000, rate: 0.20 },
  { cap: 52000000, rate: 0.25 },
  { cap: 80000000, rate: 0.30 },
  { cap: Number.POSITIVE_INFINITY, rate: 0.35 }
];

async function calculateProgressiveTax(amount) {
  let remaining = amount;
  let prevCap = 0;
  const details = [];
  let totalTax = 0;

  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    const { cap, rate } = TAX_BRACKETS[i];
    const bracketSize = cap - prevCap;
    const taxableInBracket = Math.max(0, Math.min(bracketSize, remaining));
    if (taxableInBracket > 0) {
      const tax = Math.round(taxableInBracket * rate);
      totalTax += tax;
      details.push({
        bacthue: i + 1,
        thunhapchiuthue: Math.round(taxableInBracket),
        tienthue: tax
      });
      remaining -= taxableInBracket;
    }
    prevCap = cap;
    if (remaining <= 0) break;
  }
  return { totalTax, details };
}

module.exports = {
  // POST /api/payroll/calculate
  calculatePayroll: async (req, res) => {
    const thangnam = req.body && req.body.thangnam ? req.body.thangnam : formatMonthYear(new Date());

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const employeesRes = await client.query(
        `SELECT n.MANHANVIEN AS manhanvien, n.HOTEN AS hoten,
                h.MUCLUONG AS mucluong,
                h.GIAMTRUBANTHAN AS giamtru_ban_than,
                h.SONGUOIPHUTHUOC AS songuoi_phuthuoc,
                h.TIENGIAMNPT AS tien_giam_npt
         FROM NHANVIEN n
         LEFT JOIN HO_SO_LUONG h ON n.MANHANVIEN = h.MANHANVIEN
         WHERE n.TRANGTHAI = $1`,
        ['Đang làm việc']
      );

      const created = [];
      const updated = [];
      for (const emp of employeesRes.rows) {
        const manhanvien = emp.manhanvien;
        const mucluong = Number(emp.mucluong || 0);
        const bhxh_nv = Math.round(mucluong * 0.08);
        const bhyt_nv = Math.round(mucluong * 0.015);
        const bhtn_nv = Math.round(mucluong * 0.01);
        const tongBaoHiemNV = bhxh_nv + bhyt_nv + bhtn_nv;

        const giamtrubanthan = Number(emp.giamtru_ban_than || 11000000);
        const tiengiamnpt = Number(emp.tien_giam_npt || 4400000);
        const songuoi = Number(emp.songuoi_phuthuoc || 0);

        const thuNhapChiuThue = Math.max(0, Math.round(mucluong - tongBaoHiemNV - giamtrubanthan - (tiengiamnpt * songuoi)));

        const { totalTax, details } = thuNhapChiuThue > 0 ? await calculateProgressiveTax(thuNhapChiuThue) : { totalTax: 0, details: [] };

        const thuclinh = Math.round(mucluong - tongBaoHiemNV - totalTax);

        // Check whether a payroll record already exists for this employee+month
        const existingPlRes = await client.query(
          `SELECT MAPHIEU FROM PHIEU_LUONG WHERE MANHANVIEN = $1 AND THANGNAM = $2`,
          [manhanvien, thangnam]
        );

        let maphieu;
        if (existingPlRes.rows.length > 0) {
          // Update existing payroll record
          maphieu = existingPlRes.rows[0].maphieu;
          await client.query(
            `UPDATE PHIEU_LUONG SET LUONG = $1, TONGBAOHIEMNV = $2, TONGTHUETNCN = $3, THUCLINH = $4, TRANGTHAI = $5 WHERE MAPHIEU = $6`,
            [mucluong, tongBaoHiemNV, totalTax, thuclinh, 'Pending', maphieu]
          );

          // Replace detail rows
          await client.query(`DELETE FROM CHI_TIET_BAO_HIEM WHERE MAPHIEU = $1`, [maphieu]);
          await client.query(`DELETE FROM CHI_TIET_THUE_TNCN WHERE MAPHIEU = $1`, [maphieu]);
        } else {
          const insertPl = await client.query(
            `INSERT INTO PHIEU_LUONG (MANHANVIEN, THANGNAM, LUONG, TONGBAOHIEMNV, TONGTHUETNCN, THUCLINH, TRANGTHAI)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING MAPHIEU`,
            [manhanvien, thangnam, mucluong, tongBaoHiemNV, totalTax, thuclinh, 'Pending']
          );
          maphieu = insertPl.rows[0].maphieu;
        }

        // Insert insurance detail and tax details
        await client.query(
          `INSERT INTO CHI_TIET_BAO_HIEM (MAPHIEU, BHXH_NV, BHYT_NV, BHTN_NV, BHXH_DN, BHYT_DN, BHTN_DN)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [maphieu, bhxh_nv, bhyt_nv, bhtn_nv, 0, 0, 0]
        );

        for (const d of details) {
          await client.query(
            `INSERT INTO CHI_TIET_THUE_TNCN (MAPHIEU, BACTHUE, THUNHAPCHIUTHUE, TIENTHUE)
             VALUES ($1,$2,$3,$4)`,
            [maphieu, d.bacthue, d.thunhapchiuthue, d.tienthue]
          );
        }

        if (existingPlRes.rows.length > 0) {
          updated.push({ manhanvien, maphieu, hoten: emp.hoten, mucluong, tongBaoHiemNV, totalTax, thuclinh });
        } else {
          created.push({ manhanvien, maphieu, hoten: emp.hoten, mucluong, tongBaoHiemNV, totalTax, thuclinh });
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, thangnam, created, updated });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('calculatePayroll error:', error);
      res.status(500).json({ error: 'Lỗi khi tính lương', details: error.message });
    } finally {
      client.release();
    }
  },

  // GET /api/payroll?thangnam=MM/YYYY
  getPayrollRecords: async (req, res) => {
    const thangnam = req.query.thangnam || formatMonthYear(new Date());
    try {
      const q = `SELECT p.MAPHIEU AS maphieu, p.MANHANVIEN AS manhanvien, n.HOTEN AS hoten,
                        p.LUONG AS luong, p.TONGBAOHIEMNV AS tongbaohiemnv,
                        p.TONGTHUETNCN AS tongthuetncn, p.THUCLINH AS thuclinh, p.TRANGTHAI AS trangthai, p.THANGNAM AS thangnam
                 FROM PHIEU_LUONG p
                 LEFT JOIN NHANVIEN n ON p.MANHANVIEN = n.MANHANVIEN
                 WHERE p.THANGNAM = $1
                 ORDER BY p.MANHANVIEN`;
      const result = await db.query(q, [thangnam]);
      res.json({ success: true, thangnam, data: result.rows });
    } catch (error) {
      console.error('getPayrollRecords error:', error);
      res.status(500).json({ error: 'Lỗi khi lấy phiếu lương', details: error.message });
    }
  }
};
