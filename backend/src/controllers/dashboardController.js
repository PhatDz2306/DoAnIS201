const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    // 1. LẤY KPI CHÍNH (Đã ép kiểu về số)
    const kpiQuery = `
      SELECT 
        COALESCE(SUM(TONGTIEN), 0)::numeric as tong_doanh_thu,
        COUNT(*)::int as tong_don_hang
      FROM HOA_DON_BAN_HANG
    `;
    const kpiResult = await db.query(kpiQuery);

    // Đếm khách hàng là khách đã tạo profile
    const customerQuery = `
      SELECT COUNT(*)::int as tong_khach_hang
      FROM KHACH_HANG
    `;
    const customerResult = await db.query(customerQuery);

    // Combine KPI data
    const kpiData = {
      tong_doanh_thu: kpiResult.rows[0].tong_doanh_thu,
      tong_don_hang: kpiResult.rows[0].tong_don_hang,
      tong_khach_hang: customerResult.rows[0].tong_khach_hang
    };

    // 2. BIỂU ĐỒ DOANH THU THEO THÁNG (Năm hiện tại)
    const chartQuery = `
      SELECT 
        EXTRACT(MONTH FROM NGAYBAN)::int as thang,
        COALESCE(SUM(TONGTIEN), 0)::numeric as doanh_thu
      FROM HOA_DON_BAN_HANG
      WHERE EXTRACT(YEAR FROM NGAYBAN) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY EXTRACT(MONTH FROM NGAYBAN)
      ORDER BY thang ASC
    `;
    const chartResult = await db.query(chartQuery);
    
    // Format lại dữ liệu biểu đồ cho Frontend dễ đọc
    const chartData = chartResult.rows.map(row => ({
      name: `Tháng ${row.thang}`,
      revenue: Number(row.doanh_thu)
    }));

    // 3. THÔNG BÁO SẢN PHẨM SẮP HẾT HÀNG (< 5 cái)
    const lowStockQuery = `
      SELECT s.MASANPHAM, s.TENSANPHAM, t.SOLUONGTON 
      FROM SAN_PHAM s
      JOIN TON_KHO t ON s.MASANPHAM = t.MASANPHAM
      WHERE t.SOLUONGTON < 5 AND s.COTHEBAN = true
      ORDER BY t.SOLUONGTON ASC
    `;
    const lowStockResult = await db.query(lowStockQuery);

    // 4. TOP 5 SẢN PHẨM BÁN CHẠY NHẤT
    const topProductsQuery = `
      SELECT 
        s.TENSANPHAM, 
        s.LOAISANPHAM, 
        SUM(c.SOLUONG)::int as tong_ban, 
        SUM(c.THANHTIEN)::numeric as doanh_thu_sp
      FROM CHI_TIET_HOA_DON c
      JOIN SAN_PHAM s ON c.MASANPHAM = s.MASANPHAM
      GROUP BY s.MASANPHAM, s.TENSANPHAM, s.LOAISANPHAM
      ORDER BY doanh_thu_sp DESC
      LIMIT 5
    `;
    const topProductsResult = await db.query(topProductsQuery);

    // 5. ĐƠN HÀNG GẦN ĐÂY NHẤT (5 đơn mới nhất)
    const recentOrdersQuery = `
      SELECT 
        h.MAHOADON, 
        COALESCE(dt.TENDOITAC, 'Khách vãng lai') as ten_khach_hang, 
        h.TONGTIEN::numeric, 
        h.NGAYBAN
      FROM HOA_DON_BAN_HANG h
      LEFT JOIN KHACH_HANG kh ON h.MADOITAC = kh.MADOITAC
      LEFT JOIN DOI_TAC dt ON kh.MADOITAC = dt.MADOITAC
      ORDER BY h.NGAYBAN DESC
      LIMIT 5
    `;
    const recentOrdersResult = await db.query(recentOrdersQuery);

    // Trả về API
    res.json({
      kpi: kpiData,
      chartData: chartData,
      notifications: lowStockResult.rows,
      topProducts: topProductsResult.rows,
      recentOrders: recentOrdersResult.rows
    });

  } catch (error) {
    console.error("Lỗi lấy dữ liệu Dashboard:", error);
    res.status(500).json({ error: 'Lỗi máy chủ khi tải Dashboard' });
  }
};