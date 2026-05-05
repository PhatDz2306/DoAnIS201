import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export default function WeeklyAttendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWeekly = async (start) => {
    setLoading(true);
    try {
      let url = 'http://localhost:5000/api/hr/employees/weekly-attendance';
      if (start) url += `?start=${encodeURIComponent(start)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const d = await res.json();
      if (res.ok) {
        setDays(d.days || []);
        setData(d.data || []);
      } else {
        setDays([]);
        setData([]);
      }
    } catch (err) {
      console.error('fetchWeekly error:', err);
      setDays([]);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeekly(); }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Chấm công tuần</h1>
          <p className="text-sm text-gray-500">Hiển thị tình trạng chấm công cho tuần hiện tại</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/employees')} className="px-3 py-2 bg-gray-100 rounded">Quay lại Nhân sự</button>
          <button onClick={() => fetchWeekly()} className="px-3 py-2 bg-indigo-600 text-white rounded">Tuần này</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        {loading ? (
          <div className="text-gray-500">Đang tải chấm công...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Nhân viên</th>
                  {days.map(d => (
                    <th key={d} className="px-2 py-2 text-center">{new Date(d).toLocaleDateString('vi-VN', { weekday: 'short' })}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(emp => (
                  <tr key={emp.manhanvien} className="border-t">
                    <td className="px-3 py-2 align-top">{emp.hoten}</td>
                    {days.map(d => (
                      <td key={d} className="px-2 py-2 text-center">
                        {emp.attendance && emp.attendance[d] ? (
                          <span className="text-emerald-600 font-bold">✓</span>
                        ) : (
                          <span className="text-red-500 font-bold">✕</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && (
              <div className="text-center py-8 text-gray-500">Không có dữ liệu chấm công.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
