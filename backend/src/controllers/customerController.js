const db = require('../config/db'); // (Nhớ kiểm tra lại đường dẫn này cho đúng với máy bạn nhé)

// --- 1. LẤY DANH SÁCH KHÁCH HÀNG KÈM THỐNG KÊ ---
exports.getAllCustomers = async (req, res) => {
    try {
        const query = `
            SELECT 
                d.MADOITAC, d.TENDOITAC, d.SODIENTHOAI, d.DIACHI, d.LOAIDOITAC,
                k.DIEMTICHLUY, k.LOAIKHACHHANG,
                COUNT(h.MAHOADON) as total_orders,
                COALESCE(SUM(h.TONGTIEN), 0) as total_spent
            FROM DOI_TAC d
            JOIN KHACH_HANG k ON d.MADOITAC = k.MADOITAC
            LEFT JOIN HOA_DON_BAN_HANG h ON d.MADOITAC = h.MADOITAC
            WHERE d.LOAIDOITAC = 'KHACH_HANG'
            GROUP BY d.MADOITAC, d.TENDOITAC, d.SODIENTHOAI, d.DIACHI, d.LOAIDOITAC, k.DIEMTICHLUY, k.LOAIKHACHHANG
            ORDER BY d.MADOITAC DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Lỗi GET khách hàng:', err);
        res.status(500).json({ error: 'Lỗi lấy danh sách khách hàng' });
    }
};

// --- 2. THÊM MỚI KHÁCH HÀNG ---
// --- 2. THÊM MỚI KHÁCH HÀNG ---
exports.createCustomer = async (req, res) => {
    const { name, phone, address } = req.body;
    try {
        // Sử dụng CTE (WITH) của PostgreSQL để Insert cùng lúc 2 bảng.
        // Đảm bảo LOAIDOITAC được set cứng là 'KHACH_HANG'.
        const query = `
            WITH new_doitac AS (
                INSERT INTO DOI_TAC (TENDOITAC, SODIENTHOAI, DIACHI, LOAIDOITAC) 
                VALUES ($1, $2, $3, 'KHACH_HANG') 
                RETURNING MADOITAC
            )
            INSERT INTO KHACH_HANG (MADOITAC, DIEMTICHLUY, LOAIKHACHHANG)
            SELECT MADOITAC, 0, 'Đồng' FROM new_doitac
            RETURNING MADOITAC;
        `;
        
        const result = await db.query(query, [name, phone, address]);
        const newId = result.rows[0].madoitac;
        
        res.json({ message: 'Thêm khách hàng thành công', madoitac: newId });
    } catch (err) {
        console.error('Lỗi chi tiết khi POST khách hàng:', err);
        // Trả về chi tiết mã lỗi để Frontend có thể dễ dàng bắt bệnh nếu còn sai
        res.status(500).json({ error: 'Lỗi thêm khách hàng', details: err.message });
    }
};

// --- 3. LẤY DANH SÁCH THÚ CƯNG CỦA 1 KHÁCH HÀNG ---
exports.getPetsByCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`SELECT * FROM HO_SO_THU_CUNG WHERE MADOITAC = $1`, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Lỗi GET thú cưng:', err);
        res.status(500).json({ error: 'Lỗi lấy danh sách thú cưng' });
    }
};

// --- 4. THÊM THÚ CƯNG CHO KHÁCH HÀNG ---
exports.createPet = async (req, res) => {
    const maDoiTac = req.params.id; // Lấy ID từ URL
    const { tenThuCung, loaiThuCung, gioiTinh } = req.body; 

    try {
        await db.query(
            `INSERT INTO HO_SO_THU_CUNG (MADOITAC, TENTHUCUNG, LOAITHUCUNG, GIOITINH) 
             VALUES ($1, $2, $3, $4)`,
            [maDoiTac, tenThuCung, loaiThuCung, gioiTinh]
        );
        res.json({ message: 'Thêm thú cưng thành công' });
    } catch (err) {
        console.error('Lỗi POST thú cưng:', err);
        res.status(500).json({ error: 'Lỗi thêm thú cưng', details: err.message });
    }
};