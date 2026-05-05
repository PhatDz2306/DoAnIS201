import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export default function PendingLeaves() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/hr/leaves/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) setPendingLeaves(data.data || []);
      else setPendingLeaves([]);
    } catch (err) {
      console.error('fetchPendingLeaves error:', err);
      setPendingLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendingLeaves(); }, []);

  const approveLeave = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn duyệt đơn này?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/hr/leaves/${id}/approve`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) {
        alert('Đã duyệt đơn');
        fetchPendingLeaves();
      } else {
        const d = await res.json();
        alert(d.error || 'Lỗi khi duyệt đơn');
      }
    } catch (err) {
      console.error('approveLeave error:', err);
      alert('Lỗi kết nối');
    }
  };

  const rejectLeave = async (id) => {
    const reason = window.prompt('Lý do từ chối (tùy chọn)');
    try {
      const res = await fetch(`http://localhost:5000/api/hr/leaves/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert('Đã từ chối đơn');
        fetchPendingLeaves();
      } else {
        const d = await res.json();
        alert(d.error || 'Lỗi khi từ chối đơn');
      }
    } catch (err) {
      console.error('rejectLeave error:', err);
      alert('Lỗi kết nối');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Đơn nghỉ phép chờ duyệt</h1>
          <p className="text-sm text-gray-500">Danh sách đơn cần admin duyệt</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/employees')} className="px-3 py-2 bg-gray-100 rounded">Quay lại Nhân sự</button>
          <button onClick={fetchPendingLeaves} className="px-3 py-2 bg-indigo-600 text-white rounded">Làm mới</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        {loading ? (
          <div className="text-gray-500">Đang tải đơn...</div>
        ) : pendingLeaves.length === 0 ? (
          <div className="text-gray-500">Không có đơn chờ duyệt.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Nhân viên</th>
                  <th className="px-3 py-2">Từ</th>
                  <th className="px-3 py-2">Đến</th>
                  <th className="px-3 py-2">Số ngày</th>
                  <th className="px-3 py-2">Lý do</th>
                  <th className="px-3 py-2">Ngày tạo</th>
                  <th className="px-3 py-2">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((p, idx) => (
                  <tr key={p.madon || idx} className="border-t">
                    <td className="px-3 py-2 align-top">{idx + 1}</td>
                    <td className="px-3 py-2 align-top">{p.hoten_nhanvien || p.hoten}</td>
                    <td className="px-3 py-2 align-top">{p.ngay_batdau ? new Date(p.ngay_batdau).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-3 py-2 align-top">{p.ngay_ketthuc ? new Date(p.ngay_ketthuc).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-3 py-2 align-top">{p.soday}</td>
                    <td className="px-3 py-2 align-top">{p.lydo}</td>
                    <td className="px-3 py-2 align-top">{p.ngaytao ? new Date(p.ngaytao).toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-3 py-2 align-top space-x-2">
                      <button onClick={() => approveLeave(p.madon)} className="px-3 py-1 bg-emerald-500 text-white rounded">Duyệt</button>
                      <button onClick={() => rejectLeave(p.madon)} className="px-3 py-1 bg-red-500 text-white rounded">Từ chối</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
