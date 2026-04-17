import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/authContext';

function formatDateShort(d) {
  if (!d) return 'N/A';
  const dd = new Date(d);
  return dd.toLocaleDateString('vi-VN');
}

function formatTime(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceManager() {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const [now, setNow] = useState(new Date());
  const [myRecords, setMyRecords] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ tongphep: 12, conlai: '-' });
  const [tab, setTab] = useState('attendance');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ fromDate: '', toDate: '', lydo: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ giovao: '', giora: '', ghichu: '', lydo: '' });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);

  const isManager = user && Array.isArray(user.quyenHan) && user.quyenHan.includes('ALL');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchMyRecords();
    fetchMyLeaves();
    fetchLeaveBalance();
    if (isManager) {
      fetchPendingLeaves();
      fetchAllRecords();
    }
  }, [user]);

  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  async function fetchMyRecords() {
    try {
      const month = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const res = await fetch(`${API_BASE}/api/attendance/my-records?thangnam=${encodeURIComponent(month)}`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok) setMyRecords(data.data || []);
    } catch (e) { console.error(e); }
  }

  async function fetchMyLeaves() {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/my-leaves`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok) setMyLeaves(data.data || []);
    } catch (e) { console.error(e); }
  }

  async function fetchPendingLeaves() {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/leaves/pending`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok) setPendingLeaves(data.data || []);
    } catch (e) { console.error(e); }
  }

  async function fetchLeaveBalance() {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/leave-balance`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok) setLeaveBalance(data.data || { tongphep: 12, conlai: 12 });
    } catch (e) { console.error('fetchLeaveBalance error', e); }
  }

  async function fetchAllRecords() {
    try {
      const month = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const res = await fetch(`${API_BASE}/api/attendance/all-records?thangnam=${encodeURIComponent(month)}`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok) setAllRecords(data.data || []);
    } catch (e) { console.error(e); }
  }

  async function handleCheckIn() {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/check-in`, { method: 'POST', headers: authHeader() });
      const data = await res.json();
      if (res.ok) { alert('Check-in thành công'); fetchMyRecords(); }
      else alert(data.error || 'Lỗi khi check-in');
    } catch (e) { alert('Lỗi kết nối'); }
  }

  async function handleCheckOut() {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/check-out`, { method: 'POST', headers: authHeader() });
      const data = await res.json();
      if (res.ok) { alert('Check-out thành công'); fetchMyRecords(); }
      else alert(data.error || 'Lỗi khi check-out');
    } catch (e) { alert('Lỗi kết nối'); }
  }

  async function submitLeave(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/attendance/leaves`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(leaveForm) });
      const data = await res.json();
      if (res.ok) { setShowLeaveModal(false); setLeaveForm({ fromDate:'', toDate:'', lydo:'' }); fetchMyLeaves(); alert('Tạo đơn thành công'); }
      else alert(data.error || 'Lỗi tạo đơn');
    } catch (e) { alert('Lỗi kết nối'); }
  }

  async function handleApprove(id) {
    if (!window.confirm('Duyệt đơn này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/attendance/leaves/${id}/approve`, { method: 'PUT', headers: authHeader() });
      const data = await res.json();
      if (res.ok) { fetchPendingLeaves(); fetchMyLeaves(); fetchLeaveBalance(); alert('Đã duyệt'); }
      else alert(data.error || 'Lỗi');
    } catch (e) { alert('Lỗi kết nối'); }
  }


  // open edit modal for manager to edit attendance
  function openEditModal(rec) {
    setEditingRecord(rec);
    const toLocalInput = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      const tz = dt.getTimezoneOffset() * 60000; // offset in ms
      return new Date(dt.getTime() - tz).toISOString().slice(0,16);
    };
    setEditForm({ giovao: toLocalInput(rec.giovao), giora: toLocalInput(rec.giora), ghichu: rec.ghichu || '', lydo: '' });
    setShowEditModal(true);
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      const toISO = (v) => v ? new Date(v).toISOString() : null;
      const body = { giovao: editForm.giovao ? toISO(editForm.giovao) : null, giora: editForm.giora ? toISO(editForm.giora) : null, ghichu: editForm.ghichu, lydo: editForm.lydo };
      const res = await fetch(`${API_BASE}/api/attendance/edit/${editingRecord.machamcong}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { setShowEditModal(false); fetchAllRecords(); fetchMyRecords(); alert('Đã cập nhật chấm công'); }
      else alert(data.error || 'Lỗi cập nhật');
    } catch (e) { alert('Lỗi kết nối'); }
  }

  async function openHistoryModal(rec) {
    try {
      const res = await fetch(`${API_BASE}/api/attendance/history/${rec.machamcong}`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok) { setHistory(data.data || []); setShowHistoryModal(true); }
      else alert(data.error || 'Lỗi lấy lịch sử');
    } catch (e) { alert('Lỗi kết nối'); }
  }

  async function handleReject(id) {
    if (!window.confirm('Từ chối đơn này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/attendance/leaves/${id}/reject`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({}) });
      const data = await res.json();
      if (res.ok) { fetchPendingLeaves(); fetchMyLeaves(); alert('Đã từ chối'); }
      else alert(data.error || 'Lỗi');
    } catch (e) { alert('Lỗi kết nối'); }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Chấm công</h1>
          <p className="text-sm text-gray-500">Xin chào, {user?.hoTen || user?.tenVaiTro || 'Nhân viên'}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono">{now.toLocaleString('vi-VN')}</div>
          <div className="mt-2 flex gap-2">
            <button onClick={handleCheckIn} className="px-4 py-2 bg-emerald-600 text-white rounded">Check-in</button>
            <button onClick={handleCheckOut} className="px-4 py-2 bg-red-500 text-white rounded">Check-out</button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => setTab('attendance')} className={`px-4 py-2 rounded ${tab==='attendance'?'bg-indigo-600 text-white':'bg-white'}`}>Bảng công của tôi</button>
        <button onClick={() => setTab('leaves')} className={`px-4 py-2 rounded ${tab==='leaves'?'bg-indigo-600 text-white':'bg-white'}`}>Nghỉ phép</button>
        {isManager && <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded ${tab==='pending'?'bg-indigo-600 text-white':'bg-white'}`}>Quản lý Đơn từ</button>}
        {isManager && <button onClick={() => setTab('allAttendance')} className={`px-4 py-2 rounded ${tab==='allAttendance'?'bg-indigo-600 text-white':'bg-white'}`}>Quản lý Bảng công</button>}
      </div>

      {tab === 'attendance' && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-3">Bảng công tháng này</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Số giờ</th><th>OT</th><th>Ghi chú</th></tr>
            </thead>
            <tbody>
              {myRecords.map(r => (
                <tr key={r.machamcong} className="border-t"><td>{formatDateShort(r.ngay)}</td><td>{formatTime(r.giovao)}</td><td>{formatTime(r.giora)}</td><td>{r.sogiolam}</td><td>{r.tangca}</td><td>{r.ghichu}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Nghỉ phép</h2>
            <button onClick={() => setShowLeaveModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded">Tạo đơn xin nghỉ</button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded">Tổng phép năm: {leaveBalance.tongphep}</div>
            <div className="p-3 bg-gray-50 rounded">Đã dùng: {myLeaves.filter(l => l.trangthai === 'Đã duyệt').reduce((s, v) => s + Number(v.soday || 0), 0)}</div>
            <div className="p-3 bg-gray-50 rounded">Còn lại: {leaveBalance.conlai}</div>
          </div>

          <h3 className="font-semibold mb-2">Lịch sử đơn</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600"><tr><th>Ngày tạo</th><th>Khoảng</th><th>Số ngày</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {myLeaves.map(l => (
                <tr key={l.madon} className="border-t"><td>{formatDateShort(l.ngaytao)}</td><td>{formatDateShort(l.ngay_batdau)} → {formatDateShort(l.ngay_ketthuc)}</td><td>{l.soday}</td><td>{l.trangthai}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pending' && isManager && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-3">Đơn chờ duyệt</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600"><tr><th>Người yêu cầu</th><th>Khoảng</th><th>Số ngày</th><th>Lý do</th><th>Hành động</th></tr></thead>
            <tbody>
              {pendingLeaves.map(p => (
                <tr key={p.madon} className="border-t"><td>{p.hoten_nhanvien}</td><td>{formatDateShort(p.ngay_batdau)} → {formatDateShort(p.ngay_ketthuc)}</td><td>{p.soday}</td><td>{p.lydo}</td><td className="flex gap-2"><button onClick={() => handleApprove(p.madon)} className="px-3 py-1 bg-emerald-600 text-white rounded">Duyệt</button><button onClick={() => handleReject(p.madon)} className="px-3 py-1 bg-red-500 text-white rounded">Từ chối</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'allAttendance' && isManager && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-3">Bảng công toàn công ty</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600"><tr><th>NV</th><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Số giờ</th><th>Hành động</th></tr></thead>
            <tbody>
              {allRecords.map(r => (
                <tr key={r.machamcong} className="border-t"><td>{r.manhanvien}</td><td>{formatDateShort(r.ngay)}</td><td>{formatTime(r.giovao)}</td><td>{formatTime(r.giora)}</td><td>{r.sogiolam}</td><td className="flex gap-2"><button onClick={() => openEditModal(r)} className="px-3 py-1 bg-yellow-500 text-white rounded">Sửa</button><button onClick={() => openHistoryModal(r)} className="px-3 py-1 bg-gray-200 rounded">Lịch sử</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="font-bold mb-3">Tạo đơn xin nghỉ</h3>
            <form onSubmit={submitLeave} className="space-y-3">
              <div>
                <label className="block text-sm">Từ ngày</label>
                <input required type="date" value={leaveForm.fromDate} onChange={e => setLeaveForm({...leaveForm, fromDate: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm">Đến ngày</label>
                <input required type="date" value={leaveForm.toDate} onChange={e => setLeaveForm({...leaveForm, toDate: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm">Lý do</label>
                <textarea value={leaveForm.lydo} onChange={e => setLeaveForm({...leaveForm, lydo: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Gửi đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal (Manager) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="font-bold mb-3">Sửa chấm công</h3>
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className="block text-sm">Giờ vào</label>
                <input type="datetime-local" value={editForm.giovao} onChange={e => setEditForm({...editForm, giovao: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm">Giờ ra</label>
                <input type="datetime-local" value={editForm.giora} onChange={e => setEditForm({...editForm, giora: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm">Ghi chú</label>
                <input type="text" value={editForm.ghichu} onChange={e => setEditForm({...editForm, ghichu: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm">Lý do chỉnh sửa (bắt buộc)</label>
                <input required type="text" value={editForm.lydo} onChange={e => setEditForm({...editForm, lydo: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal (Manager) */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-3/4 max-h-[80vh] overflow-auto">
            <h3 className="font-bold mb-3">Lịch sử chỉnh sửa</h3>
            <div className="space-y-2">
              {history.length === 0 && <div className="text-sm text-gray-500">Chưa có lịch sử</div>}
              {history.map(h => (
                <div key={h.idsua} className="p-3 border rounded">
                  <div className="text-sm text-gray-600">{new Date(h.ngaysua).toLocaleString('vi-VN')} — {h.nguoisua_hoten || h.nguoisua}</div>
                  <div className="text-sm">Giờ vào: {h.giovao_cu ? new Date(h.giovao_cu).toLocaleString() : '-'} → {h.giovao_moi ? new Date(h.giovao_moi).toLocaleString() : '-'}</div>
                  <div className="text-sm">Giờ ra: {h.giora_cu ? new Date(h.giora_cu).toLocaleString() : '-'} → {h.giora_moi ? new Date(h.giora_moi).toLocaleString() : '-'}</div>
                  <div className="text-sm">Số giờ: {h.sogiolam_cu ?? '-'} → {h.sogiolam_moi ?? '-'}</div>
                  <div className="text-sm">Lý do: {h.lydo || '-'}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right"><button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 bg-gray-200 rounded">Đóng</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
