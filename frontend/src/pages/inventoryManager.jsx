import { useState, useEffect } from 'react';

export default function InventoryManager() {
  const [inventory, setInventory] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importForm, setImportForm] = useState({ masanpham: '', soluong: '', dongia: '' });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error('Lỗi tải kho:', err);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importForm.masanpham || importForm.soluong <= 0) return alert('Dữ liệu không hợp lệ!');

    const payload = {
      items: [{
        masanpham: parseInt(importForm.masanpham),
        soluong: parseInt(importForm.soluong),
        dongia: parseInt(importForm.dongia) || 0
      }]
    };

    try {
      const res = await fetch('http://localhost:5000/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Nhập kho thành công!');
        setImportForm({ masanpham: '', soluong: '', dongia: '' });
        setIsImporting(false);
        fetchInventory(); // Load lại bảng tồn kho ngay lập tức
      }
    } catch (err) {
      console.error('Lỗi nhập kho:', err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">🏢 Quản lý Tồn Kho</h1>
        <button 
          onClick={() => setIsImporting(!isImporting)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors"
        >
          {isImporting ? 'Đóng Form' : '+ Tạo Phiếu Nhập Kho'}
        </button>
      </div>

      {/* FORM NHẬP KHO */}
      {isImporting && (
        <div className="bg-green-50 p-6 rounded-xl shadow-sm mb-8 border border-green-200">
          <h2 className="font-semibold text-green-800 mb-4">Nhập hàng mới vào kho</h2>
          <form onSubmit={handleImportSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Chọn sản phẩm</label>
              <select 
                value={importForm.masanpham}
                onChange={e => setImportForm({...importForm, masanpham: e.target.value})}
                className="w-full border rounded-lg p-2 outline-none" required
              >
                <option value="">-- Chọn hàng hóa --</option>
                {inventory.map(item => (
                  <option key={item.masanpham} value={item.masanpham}>{item.tensanpham}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-600 mb-1">Số lượng</label>
              <input type="number" min="1" value={importForm.soluong} onChange={e => setImportForm({...importForm, soluong: e.target.value})} className="w-full border rounded-lg p-2 outline-none" required />
            </div>
            <div className="w-48">
              <label className="block text-sm text-gray-600 mb-1">Đơn giá nhập</label>
              <input type="number" min="0" value={importForm.dongia} onChange={e => setImportForm({...importForm, dongia: e.target.value})} className="w-full border rounded-lg p-2 outline-none" required />
            </div>
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Lưu Phiếu</button>
          </form>
        </div>
      )}

      {/* BẢNG TỒN KHO */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mã SP</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên Hàng Hóa</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Số Lượng Tồn</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventory.map(item => (
              <tr key={item.masanpham} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">#{item.masanpham}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{item.tensanpham}</td>
                <td className="px-6 py-4 text-center font-bold text-lg text-indigo-600">
                  {item.soluongton} <span className="text-sm font-normal text-gray-500">{item.donvitinh}</span>
                </td>
                <td className="px-6 py-4">
                  {item.soluongton > 0 
                    ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Còn hàng</span>
                    : <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Hết hàng</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}