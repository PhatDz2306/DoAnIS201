import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';

export default function EmployeeManager() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    hoten: '', sdt: '', email: '', username: '', password: '', maVaiTro: 2
  });

  // Gọi API lấy danh sách khi load trang
  const fetchEmployees = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/employees', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) setEmployees(data);
    } catch (error) {
      console.error('Lỗi fetch:', error);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // Xử lý submit form tạo nhân viên
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Tạo nhân viên thành công!');
        setShowAddForm(false);
        fetchEmployees(); // Tải lại bảng
        setFormData({ hoten: '', sdt: '', email: '', username: '', password: '', maVaiTro: 2 });
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối server');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Nhân sự</h1>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
        >
          {showAddForm ? 'Hủy' : '+ Thêm Nhân viên'}
        </button>
      </div>

      {/* Form thêm nhân viên (Chỉ hiện khi bấm nút) */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-white p-6 rounded-xl shadow-sm mb-6 grid grid-cols-2 gap-4 border border-gray-200">
          <input required type="text" placeholder="Họ và tên" className="p-2 border rounded" value={formData.hoten} onChange={e => setFormData({...formData, hoten: e.target.value})} />
          <input required type="text" placeholder="Số điện thoại" className="p-2 border rounded" value={formData.sdt} onChange={e => setFormData({...formData, sdt: e.target.value})} />
          <input required type="email" placeholder="Email" className="p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input required type="text" placeholder="Tên đăng nhập" className="p-2 border rounded" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          <input required type="password" placeholder="Mật khẩu khởi tạo" className="p-2 border rounded" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <select className="p-2 border rounded" value={formData.maVaiTro} onChange={e => setFormData({...formData, maVaiTro: Number(e.target.value)})}>
            <option value={1}>Quản lý (Admin)</option>
            <option value={2}>Nhân viên quầy</option>
            <option value={3}>Nhân viên kho</option>
            <option value={4}>Nhân viên dịch vụ</option>
          </select>
          <button type="submit" className="col-span-2 bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold">Lưu Nhân Viên</button>
        </form>
      )}

      {/* Bảng danh sách */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">ID</th>
              <th className="p-4 font-semibold text-gray-600">Họ tên</th>
              <th className="p-4 font-semibold text-gray-600">Tài khoản</th>
              <th className="p-4 font-semibold text-gray-600">Vai trò</th>
              <th className="p-4 font-semibold text-gray-600">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.manhanvien} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 text-gray-500">NV{emp.manhanvien}</td>
                <td className="p-4 font-medium">{emp.hoten}</td>
                <td className="p-4 text-indigo-600">{emp.username}</td>
                <td className="p-4"><span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{emp.tenvaitro}</span></td>
                <td className="p-4"><span className="text-green-600 font-medium">{emp.trangthai}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}