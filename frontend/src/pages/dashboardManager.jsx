import React, { useState, useEffect } from 'react';
import { Search, Bell, Plus, TrendingUp, ShoppingBag, Users, Star, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import axios from 'axios';

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [stats, setStats] = useState({
    kpi: { tong_doanh_thu: 0, tong_don_hang: 0, tong_khach_hang: 0 },
    chartData: [],
    notifications: [],
    topProducts: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);
        const response = await axios.get('http://localhost:5000/api/dashboard/stats');
        console.log("Dashboard data fetched:", response.data);
        setStats(response.data);
      } catch (error) {
        console.error("Lỗi khi gọi API Dashboard:", error);
        setError(error.response?.data?.error || error.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatVND = (money) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(money || 0);
  };

  // Rút gọn số tiền trên trục Y của biểu đồ (VD: 1.500.000 -> 1,5 Tr)
  const formatCompactVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu Dashboard...</div>;

  if (error) return <div className="p-8 text-center text-red-500">❌ Lỗi: {error}</div>;

  return (
    <div className="p-8 bg-gradient-to-br from-rose-50/50 via-orange-50/30 to-white min-h-full font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">Tổng quan hệ thống</p>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Dashboard Thống Kê ✨</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 relative"
            >
              <Bell size={20} className="text-gray-600" />
              {stats.notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                <p className="text-sm font-bold text-gray-800 mb-2">Cảnh báo Tồn Kho</p>
                {stats.notifications.length === 0 ? (
                  <p className="text-xs text-gray-500">Kho đang ổn định.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stats.notifications.map((item, idx) => (
                      <div key={idx} className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                        ⚠️ <b>{item.tensanpham}</b> chỉ còn {item.soluongton} SP
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-1">Tổng Doanh Thu</p>
          <h3 className="text-2xl font-bold text-gray-800">{formatVND(stats.kpi.tong_doanh_thu)}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-1">Tổng Đơn Hàng Đã Bán</p>
          <h3 className="text-2xl font-bold text-gray-800">{stats.kpi.tong_don_hang} đơn</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium mb-1">Tổng Số Khách Hàng</p>
          <h3 className="text-2xl font-bold text-gray-800">{stats.kpi.tong_khach_hang} người</h3>
        </div>
      </div>

      {/* BIỂU ĐỒ DOANH THU */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Biểu Đồ Doanh Thu Năm Nay</h3>
        {stats.chartData.length === 0 ? (
          <div className="h-64 w-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
            Chưa có dữ liệu doanh thu để vẽ biểu đồ
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FBBF24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} tickFormatter={formatCompactVND} />
                <Tooltip 
                  formatter={(value) => [formatVND(value), "Doanh thu"]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#FBBF24" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DANH SÁCH THẬT */}
      <div className="grid grid-cols-2 gap-6 pb-10">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Sản Phẩm Bán Chạy Tốt Nhất</h3>
          <div className="space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Chưa có sản phẩm nào được bán</p>
            ) : (
              stats.topProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition border-b border-gray-50 last:border-0">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-400 font-bold w-4">#{idx + 1}</span>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{prod.tensanpham}</h4>
                      <p className="text-xs text-gray-500">{prod.loaisanpham}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-gray-800 text-sm">{formatVND(prod.doanh_thu_sp)}</h4>
                    <span className="text-xs text-gray-500">{prod.tong_ban} bán ra</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Đơn Hàng Mới Nhất</h3>
          <div className="space-y-4">
            {stats.recentOrders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Chưa có đơn hàng nào</p>
            ) : (
              stats.recentOrders.map((order, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition border-b border-gray-50 last:border-0">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">
                      {order.ten_khach_hang}
                    </h4>
                    <p className="text-xs text-gray-500">Mã đơn: #{order.mahoadon}</p>
                  </div>
                  <div className="text-right font-bold text-green-600">
                    {formatVND(order.tongtien)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}