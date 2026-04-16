import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';

export default function EmployeeManager() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  
  // State cho thêm mới
  const [formData, setFormData] = useState({
    hoten: '', sdt: '', email: '', username: '', password: '', maVaiTro: 2,
    mucLuong: '', soNguoiphuthuoc: ''
  });

  // State cho Cập nhật
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  // View mode: 'staff' or 'payroll'
  const [viewMode, setViewMode] = useState('staff');
  const [payrollData, setPayrollData] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

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

  useEffect(() => {
    if (viewMode === 'payroll') fetchPayrollRecords();
  }, [viewMode]);

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
    } catch (e) {
      return String(value || 0);
    }
  };

  const fetchPayrollRecords = async (thangnam) => {
    setPayrollLoading(true);
    try {
      const url = thangnam ? `http://localhost:5000/api/payroll?thangnam=${encodeURIComponent(thangnam)}` : 'http://localhost:5000/api/payroll';
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok) setPayrollData(data.data || []);
      else setPayrollData([]);
    } catch (error) {
      console.error('Lỗi tải payroll:', error);
      setPayrollData([]);
    } finally {
      setPayrollLoading(false);
    }
  };

  const runPayroll = async () => {
    if (!window.confirm('Chạy tính lương cho tất cả nhân viên đang làm việc cho tháng hiện tại?')) return;
    setPayrollLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đã chạy tính lương thành công');
        fetchPayrollRecords();
      } else {
        alert(data.error || 'Lỗi khi chạy tính lương');
      }
    } catch (error) {
      console.error('runPayroll error:', error);
      alert('Lỗi kết nối server khi chạy tính lương');
    } finally {
      setPayrollLoading(false);
    }
  };

  // 1. XỬ LÝ THÊM MỚI
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          maVaiTro: Number(formData.maVaiTro),
          mucLuong: Number(formData.mucLuong || 0),
          soNguoiphuthuoc: Number(formData.soNguoiphuthuoc || 0)
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Tạo nhân viên thành công!');
        setShowAddForm(false);
        fetchEmployees();
          setFormData({ hoten: '', sdt: '', email: '', username: '', password: '', maVaiTro: 2, mucLuong: '', soNguoiphuthuoc: '' });
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Lỗi kết nối server');
    }
  };

  // 2. XỬ LÝ MỞ FORM CẬP NHẬT
  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setEditFormData({
      hoten: emp.hoten,
      sdt: emp.sdt,
      email: emp.email,
      maVaiTro: emp.mavaitro || 2,
      trangthai: emp.trangthai,
      mucLuong: emp.mucluong || '',
      soNguoiphuthuoc: emp.songuoiphuthuoc || ''
    });
  };

  // 3. XỬ LÝ LƯU CẬP NHẬT
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editFormData,
        maVaiTro: Number(editFormData.maVaiTro),
        mucLuong: editFormData.mucLuong === '' ? undefined : Number(editFormData.mucLuong),
        soNguoiphuthuoc: editFormData.soNguoiphuthuoc === '' ? undefined : Number(editFormData.soNguoiphuthuoc)
      };

      const res = await fetch(`http://localhost:5000/api/auth/employees/${editingEmployee.manhanvien}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Cập nhật thành công!');
        setEditingEmployee(null); // Đóng modal
        fetchEmployees(); // Tải lại data
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra khi cập nhật');
      }
    } catch (error) {
      alert('Lỗi kết nối server');
    }
  };

  // 4. XỬ LÝ XÓA MỀM
  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn cho nhân viên "${name}" nghỉ việc không? Tài khoản sẽ bị khóa.`)) {
      try {
        const res = await fetch(`http://localhost:5000/api/auth/employees/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          alert('Đã cập nhật trạng thái nghỉ việc!');
          fetchEmployees();
        }
      } catch (error) {
        alert('Lỗi kết nối server');
      }
    }
  };

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.trangthai === 'Đang làm việc').length;
  const inactiveEmployees = totalEmployees - activeEmployees;
  const adminCount = employees.filter(emp => emp.tenvaitro.includes('Quản lý')).length;

  const filteredEmployees = employees.filter(emp => {
    if (activeTab === 'Active') return emp.trangthai === 'Đang làm việc';
    if (activeTab === 'Inactive') return emp.trangthai !== 'Đang làm việc';
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER & THỐNG KÊ (Giữ nguyên) */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Nhân sự</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý hồ sơ, vai trò và trạng thái nhân viên</p>
        </div>
        <button 
          onClick={() => { setShowAddForm(!showAddForm); setEditingEmployee(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
        >
          {showAddForm ? '✕ Đóng biểu mẫu' : '➕ Thêm Nhân viên'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">👥</div>
          <div><p className="text-sm text-gray-500 font-medium">Tổng Nhân Sự</p><p className="text-2xl font-bold text-gray-800">{totalEmployees}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl">✅</div>
          <div><p className="text-sm text-gray-500 font-medium">Đang Làm Việc</p><p className="text-2xl font-bold text-gray-800">{activeEmployees}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl">⏸️</div>
          <div><p className="text-sm text-gray-500 font-medium">Đã Nghỉ Việc</p><p className="text-2xl font-bold text-gray-800">{inactiveEmployees}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 text-xl">🛡️</div>
          <div><p className="text-sm text-gray-500 font-medium">Quản lý (Admin)</p><p className="text-2xl font-bold text-gray-800">{adminCount}</p></div>
        </div>
      </div>

      {/* FORM THÊM MỚI NHÂN VIÊN */}
      {showAddForm && !editingEmployee && (
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-indigo-100">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">Tạo hồ sơ nhân viên mới</h2>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label><input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.hoten} onChange={e => setFormData({...formData, hoten: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label><input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.sdt} onChange={e => setFormData({...formData, sdt: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input required type="email" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label><input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu khởi tạo</label><input required type="password" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.maVaiTro} onChange={e => setFormData({...formData, maVaiTro: Number(e.target.value)})}>
                <option value={1}>Quản lý (Admin)</option>
                <option value={2}>Nhân viên quầy</option>
                <option value={3}>Nhân viên kho</option>
                <option value={4}>Nhân viên dịch vụ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức lương (VND)</label>
              <input required type="number" min="0" step="1000" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.mucLuong} onChange={e => setFormData({...formData, mucLuong: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số người phụ thuộc</label>
              <input required type="number" min="0" step="1" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={formData.soNguoiphuthuoc} onChange={e => setFormData({...formData, soNguoiphuthuoc: e.target.value})} />
            </div>
            <div className="md:col-span-3 flex justify-end mt-2">
              <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700">Lưu Nhân Viên</button>
            </div>
          </form>
        </div>
      )}

      {/* FORM CẬP NHẬT NHÂN VIÊN (Hiển thị khi bấm nút Sửa) */}
      {editingEmployee && (
        <div className="bg-amber-50 p-6 rounded-2xl shadow-sm mb-8 border border-amber-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2">✏️ Cập nhật thông tin: {editingEmployee.hoten}</h2>
            <button onClick={() => setEditingEmployee(null)} className="text-gray-500 hover:text-red-500 font-bold">✕ Đóng</button>
          </div>
          <form onSubmit={handleUpdateSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label><input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.hoten} onChange={e => setEditFormData({...editFormData, hoten: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label><input required type="text" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.sdt} onChange={e => setEditFormData({...editFormData, sdt: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input required type="email" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} /></div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.maVaiTro} onChange={e => setEditFormData({...editFormData, maVaiTro: Number(e.target.value)})}>
                <option value={1}>Quản lý (Admin)</option>
                <option value={2}>Nhân viên quầy</option>
                <option value={3}>Nhân viên kho</option>
                <option value={4}>Nhân viên dịch vụ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.trangthai} onChange={e => setEditFormData({...editFormData, trangthai: e.target.value})}>
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Đã nghỉ việc">Đã nghỉ việc</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức lương (VND)</label>
              <input type="number" min="0" step="1000" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.mucLuong} onChange={e => setEditFormData({...editFormData, mucLuong: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số người phụ thuộc</label>
              <input type="number" min="0" step="1" className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white" value={editFormData.soNguoiphuthuoc} onChange={e => setEditFormData({...editFormData, soNguoiphuthuoc: e.target.value})} />
            </div>

            <div className="md:col-span-3 flex justify-end mt-2 gap-3">
              <button type="button" onClick={() => setEditingEmployee(null)} className="bg-gray-200 text-gray-800 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-300">Hủy</button>
              <button type="submit" className="bg-amber-500 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-amber-600">Lưu Thay Đổi</button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE TOGGLE */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <button onClick={() => setViewMode('staff')} className={`px-4 py-2 rounded-xl font-medium ${viewMode === 'staff' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            Staff Directory
          </button>
          <button onClick={() => setViewMode('payroll')} className={`px-4 py-2 rounded-xl font-medium ${viewMode === 'payroll' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            Payroll
          </button>
        </div>
        {viewMode === 'payroll' && (
          <div className="flex items-center gap-2">
            <button onClick={runPayroll} disabled={payrollLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold">
              {payrollLoading ? 'Running...' : 'Run Payroll'}
            </button>
          </div>
        )}
      </div>

      {viewMode === 'staff' && (
        <>
          {/* FILTER TABS */}
          <div className="flex border-b border-gray-200 mb-6">
            {['All', 'Active', 'Inactive'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${ activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                {tab === 'All' ? 'Tất cả nhân viên' : tab === 'Active' ? 'Đang làm việc' : 'Đã nghỉ việc'}
              </button>
            ))}
          </div>

          {/* GRID CARDS - DANH SÁCH NHÂN VIÊN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((emp) => {
              const isActive = emp.trangthai === 'Đang làm việc';
              const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.hoten)}&background=random&color=fff&size=128`;

              return (
                <div key={emp.manhanvien} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all relative group">
                  
                  {/* ACTION BUTTONS (Sửa / Xóa) hiển thị khi hover */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                    <button onClick={() => handleOpenEdit(emp)} className="p-2 bg-white rounded-full shadow hover:bg-amber-50 hover:text-amber-600 text-gray-500 transition" title="Sửa thông tin">
                      ✏️
                    </button>
                    {isActive && (
                      <button onClick={() => handleDelete(emp.manhanvien, emp.hoten)} className="p-2 bg-white rounded-full shadow hover:bg-red-50 hover:text-red-600 text-gray-500 transition" title="Cho nghỉ việc">
                        🗑️
                      </button>
                    )}
                  </div>

                  {/* Card Header & Avatar */}
                  <div className="p-6 flex flex-col items-center text-center border-b border-gray-50 relative pt-8">
                    <span className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`} title={emp.trangthai}></span>
                    <img src={avatarUrl} alt={emp.hoten} className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 mb-3 shadow-sm" />
                    <h3 className="text-lg font-bold text-gray-800">{emp.hoten}</h3>
                    <p className="text-sm text-gray-500 font-medium">@{emp.username}</p>
                    <div className="mt-3">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">{emp.tenvaitro}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-gray-50/50 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600"><span className="text-gray-400">📧</span><span className="truncate">{emp.email}</span></div>
                    <div className="flex items-center gap-3 text-sm text-gray-600"><span className="text-gray-400">📞</span><span>{emp.sdt}</span></div>
                  </div>

                  <div className="px-5 py-4 bg-white border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                    <span>Mã NV: #{emp.manhanvien}</span>
                    <span>Vào làm: {formatDate(emp.ngayvaolam)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100 mt-6">
              Không tìm thấy nhân viên nào.
            </div>
          )}
        </>
      )}

      {viewMode === 'payroll' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">Payroll - Phiếu lương</h2>
          {payrollLoading ? (
            <div className="text-gray-500">Đang tải dữ liệu bảng lương...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gross Salary</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Social Insurance</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Personal Income Tax</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollData.map((r) => (
                    <tr key={r.maphieu}>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium">{r.hoten}</div>
                        <div className="text-xs text-gray-400">#{r.manhanvien}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(r.luong)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(r.tongbaohiemnv)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(r.tongthuetncn)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatCurrency(r.thuclinh)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.trangthai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payrollData.length === 0 && (
                <div className="text-center py-8 text-gray-500">Không tìm thấy phiếu lương cho tháng này.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}