import React from 'react';
import { useNavigate } from 'react-router-dom';

const modules = [
  { key: 'dashboard', title: 'Bảng Điều Khiển', path: '/dashboard' },
  { key: 'products', title: 'Sản phẩm', path: '/products' },
  { key: 'inventory', title: 'Kho hàng', path: '/inventory' },
  { key: 'pos', title: 'POS', path: '/pos' },
  { key: 'customers', title: 'Khách hàng', path: '/customers' },
  { key: 'employees', title: 'Nhân sự', path: '/employees' },
  { key: 'payroll', title: 'Lương', path: '/payroll' },
  { key: 'reports', title: 'Báo cáo', path: '/dashboard' },
  { key: 'accounting', title: 'Kế toán', path: '/accounting' },
  { key: 'services', title: 'Dịch vụ', path: '/services' }
];

export default function ModulesGrid() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Các Module</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {modules.map(m => (
          <button key={m.key} onClick={() => navigate(m.path)} className="bg-white p-6 rounded-2xl shadow-sm text-left hover:shadow-md transition">
            <div className="text-lg font-bold mb-2">{m.title}</div>
            <div className="text-sm text-gray-500">Mở {m.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
