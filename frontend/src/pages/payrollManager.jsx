import React, { useEffect, useState } from 'react';

export default function PayrollManager() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [profile, setProfile] = useState({ mucluong: '', songuoiphuthuoc: '', giamtru_banthan: '', tien_giam_npt: '' });

  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'payslips'
  const [payslips, setPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/hr/employees', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok) setEmployees(data || []);
      else setEmployees([]);
    } catch (err) {
      console.error('fetchEmployees error:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async () => {
    setPayslipsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payroll', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok) setPayslips(data.data || []);
      else setPayslips([]);
    } catch (err) {
      console.error('fetchPayslips error:', err);
      setPayslips([]);
    } finally {
      setPayslipsLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { if (activeTab === 'payslips') fetchPayslips(); }, [activeTab]);

  const openEdit = async (emp) => {
    setEditing(emp);
    try {
      const res = await fetch(`http://localhost:5000/api/payroll/profile/${emp.manhanvien}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok && data.data) {
        setProfile({ mucluong: data.data.mucluong || '', songuoiphuthuoc: data.data.songuoiphuthuoc || '', giamtru_banthan: data.data.giamtrubandahan || data.data.giamtru_banthan || '', tien_giam_npt: data.data.tien_giam_npt || '' });
      } else {
        setProfile({ mucluong: '', songuoiphuthuoc: '', giamtru_banthan: '', tien_giam_npt: '' });
      }
    } catch (err) {
      console.error('openEdit error:', err);
    }
  };

  const saveProfile = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`http://localhost:5000/api/payroll/profile/${editing.manhanvien}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ mucluong: Number(profile.mucluong || 0), songuoiphuthuoc: Number(profile.songuoiphuthuoc || 0), giamtru_banthan: Number(profile.giamtru_banthan || 0), tien_giam_npt: Number(profile.tien_giam_npt || 0) })
      });
      if (res.ok) {
        alert('Đã lưu hồ sơ lương');
        setEditing(null);
        fetchEmployees();
        if (activeTab === 'payslips') fetchPayslips();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi khi lưu');
      }
    } catch (err) {
      console.error('saveProfile error:', err);
      alert('Lỗi kết nối');
    }
  };

  const saveBtnDisabled = false;

  const filtered = employees.filter(e => `${e.hoten || ''} ${e.manhanvien || ''}`.toLowerCase().includes(search.toLowerCase()));

  const runPayroll = async () => {
    if (!window.confirm('Chạy tính lương cho tất cả nhân viên đang làm việc cho tháng hiện tại?')) return;
    setPayslipsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đã chạy tính lương thành công');
        fetchPayslips();
      } else {
        alert(data.error || 'Lỗi khi chạy tính lương');
      }
    } catch (err) {
      console.error('runPayroll error:', err);
      alert('Lỗi kết nối server khi chạy tính lương');
    } finally {
      setPayslipsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    try { return new Intl.NumberFormat('vi-VN').format(Number(value || 0)); } catch (e) { return String(value || 0); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Lương</h1>
          <p className="text-sm text-gray-500">Quản lý hồ sơ lương và phiếu lương</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên..." className="p-2 border rounded" />
          <button onClick={fetchEmployees} className="bg-indigo-600 text-white px-3 py-2 rounded">Làm mới</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'employees' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          Nhân viên
        </button>
        <button onClick={() => setActiveTab('payslips')} className={`px-4 py-2 rounded-xl font-medium ${activeTab === 'payslips' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          Phiếu lương
        </button>
      </div>

      {activeTab === 'employees' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Nhân viên</th>
                <th className="px-3 py-2">Mức lương</th>
                <th className="px-3 py-2">Người phụ thuộc</th>
                <th className="px-3 py-2">Giảm trừ BN</th>
                <th className="px-3 py-2">Tiền giảm NPT</th>
                <th className="px-3 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-gray-500">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-gray-500">Không tìm thấy</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.manhanvien} className="border-t">
                  <td className="px-3 py-2">{emp.hoten} <div className="text-xs text-gray-400">#{emp.manhanvien}</div></td>
                  <td className="px-3 py-2">{emp.mucluong ? formatCurrency(emp.mucluong) : '-'}</td>
                  <td className="px-3 py-2">{(emp.songuoiphuthuoc !== null && typeof emp.songuoiphuthuoc !== 'undefined') ? emp.songuoiphuthuoc : '-'}</td>
                  <td className="px-3 py-2">{emp.giamtru_banthan || emp.giamtru_ban_than || '-'}</td>
                  <td className="px-3 py-2">{emp.tien_giam_npt || '-'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => openEdit(emp)} className="px-3 py-1 bg-amber-500 text-white rounded">Sửa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payslips' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Phiếu lương</h2>
            <div className="flex items-center gap-2">
              <button onClick={runPayroll} disabled={payslipsLoading} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold">{payslipsLoading ? 'Running...' : 'Chạy tính lương'}</button>
              <button onClick={fetchPayslips} className="px-3 py-2 bg-gray-100 rounded">Làm mới</button>
            </div>
          </div>

          {payslipsLoading ? (
            <div className="text-gray-500">Đang tải dữ liệu phiếu lương...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lương</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bảo hiểm</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thuế</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thực lãnh</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payslips.map((r) => (
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
              {payslips.length === 0 && (
                <div className="text-center py-8 text-gray-500">Không tìm thấy phiếu lương cho tháng này.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit modal simple */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="font-bold mb-4">Hồ sơ lương: {editing.hoten}</h3>
            <div className="grid grid-cols-1 gap-3">
              <label>Mức lương (VND)
                <input value={profile.mucluong} onChange={e => setProfile({...profile, mucluong: e.target.value})} className="w-full p-2 border rounded mt-1" />
              </label>
              <label>Số người phụ thuộc
                <input value={profile.songuoiphuthuoc} onChange={e => setProfile({...profile, songuoiphuthuoc: e.target.value})} className="w-full p-2 border rounded mt-1" />
              </label>
              <label>Giảm trừ bản thân
                <input value={profile.giamtru_banthan} onChange={e => setProfile({...profile, giamtru_banthan: e.target.value})} className="w-full p-2 border rounded mt-1" />
              </label>
              <label>Tiền giảm NPT
                <input value={profile.tien_giam_npt} onChange={e => setProfile({...profile, tien_giam_npt: e.target.value})} className="w-full p-2 border rounded mt-1" />
              </label>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setEditing(null)} className="px-3 py-2 border rounded">Hủy</button>
                <button onClick={saveProfile} className="px-3 py-2 bg-indigo-600 text-white rounded">Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
