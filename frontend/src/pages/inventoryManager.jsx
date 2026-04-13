import { useState, useEffect, useRef } from 'react';

export default function InventoryManager() {
  const [inventory, setInventory] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importForm, setImportForm] = useState({ masanpham: '', soluong: '', dongia: '' });
  
  // --- STATES CHO TÍNH NĂNG TÌM KIẾM SẢN PHẨM ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null); // Để xử lý click ra ngoài thì đóng dropdown

  useEffect(() => {
    fetchInventory();
    
    // Xử lý sự kiện click ra ngoài dropdown tìm kiếm
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    if (!importForm.masanpham || importForm.soluong <= 0) return alert('Vui lòng chọn đúng sản phẩm từ danh sách và nhập số lượng hợp lệ!');

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
        // Reset form và thanh search
        setImportForm({ masanpham: '', soluong: '', dongia: '' });
        setSearchQuery('');
        setIsImporting(false);
        fetchInventory(); 
      }
    } catch (err) {
      console.error('Lỗi nhập kho:', err);
    }
  };

  // --- LỌC DANH SÁCH TÌM KIẾM ---
  const filteredInventory = inventory.filter(item => 
    item.tensanpham.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.masanpham.toString().includes(searchQuery)
  );

  const handleSelectProduct = (product) => {
    setImportForm({ ...importForm, masanpham: product.masanpham });
    setSearchQuery(product.tensanpham); // Hiển thị tên SP lên ô input
    setShowDropdown(false); // Ẩn danh sách đi
  };

  // --- TÍNH TOÁN THỐNG KÊ ---
  const totalProducts = inventory.length;
  const lowStockCount = inventory.filter(i => i.soluongton > 0 && i.soluongton <= 10).length;
  const outOfStockCount = inventory.filter(i => i.soluongton === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.soluongton * (item.gianiemyet || 0)), 0);

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price || 0) + 'đ';

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory Summary</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi số lượng hàng hóa trong kho</p>
        </div>
        <button 
          onClick={() => {
            setIsImporting(!isImporting);
            setSearchQuery(''); // Reset ô tìm kiếm khi đóng/mở form
            setImportForm({ masanpham: '', soluong: '', dongia: '' });
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
        >
          {isImporting ? '✕ Đóng biểu mẫu' : '➕ Tạo Phiếu Nhập Kho'}
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">📦</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng Sản Phẩm</p>
            <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-xl">⚠️</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sắp Hết Hàng</p>
            <p className="text-2xl font-bold text-gray-800">{lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl">❌</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đã Hết Hàng</p>
            <p className="text-2xl font-bold text-gray-800">{outOfStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl">💰</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng Giá Trị Kho</p>
            <p className="text-xl font-bold text-gray-800">{formatPrice(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* FORM NHẬP KHO THÔNG MINH CÓ TÌM KIẾM */}
      {isImporting && (
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-indigo-100 overflow-visible relative">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-indigo-600">📥</span> Nhập hàng mới vào kho
          </h2>
          <form onSubmit={handleImportSubmit} className="flex gap-4 items-end">
            
            {/* CỤM TÌM KIẾM VÀ CHỌN SẢN PHẨM */}
            <div className="flex-1 relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tìm & Chọn sản phẩm</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="🔍 Nhập tên hoặc mã sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    setImportForm({ ...importForm, masanpham: '' }); // Xóa ID cũ nếu người dùng gõ tìm kiếm mới
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50"
                  required={!importForm.masanpham} // Yêu cầu nhập nếu chưa chọn được mã SP
                />
                
                {/* DANH SÁCH DROPDOWN TÌM KIẾM */}
                {showDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map(item => (
                        <div 
                          key={item.masanpham}
                          onClick={() => handleSelectProduct(item)}
                          className="px-4 py-3 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{item.tensanpham}</p>
                            <p className="text-xs text-gray-500">Mã: #{item.masanpham} - Kho hiện tại: {item.soluongton}</p>
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">Chọn</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">Không tìm thấy sản phẩm nào!</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
              <input type="number" min="1" value={importForm.soluong} onChange={e => setImportForm({...importForm, soluong: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50" required />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá nhập</label>
              <input type="number" min="0" value={importForm.dongia} onChange={e => setImportForm({...importForm, dongia: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50" required />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors z-0 relative">Lưu Phiếu</button>
          </form>
        </div>
      )}

      {/* BẢNG DỮ LIỆU */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-lg font-bold text-gray-800">Inventory Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                <th className="px-6 py-4 font-semibold">SKU (Mã)</th>
                <th className="px-6 py-4 font-semibold">Giá bán</th>
                <th className="px-6 py-4 font-semibold text-center">Tồn kho</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {inventory.map(item => {
                let statusInfo = { text: 'In Stock', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
                if (item.soluongton === 0) {
                  statusInfo = { text: 'Out of Stock', color: 'bg-red-50 text-red-600 border-red-200' };
                } else if (item.soluongton <= 10) {
                  statusInfo = { text: 'Low Stock', color: 'bg-amber-50 text-amber-600 border-amber-200' };
                }

                return (
                  <tr key={item.masanpham} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                          <img 
                            src={item.hinhanh || 'https://placehold.co/100x100?text=No+Img'} 
                            alt={item.tensanpham} 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{item.tensanpham}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.loaisanpham || 'Hàng hóa'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">#{item.masanpham}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{formatPrice(item.gianiemyet)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-gray-800">{item.soluongton}</span>
                      <span className="text-gray-500 ml-1">{item.donvitinh}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {inventory.length === 0 && (
            <div className="text-center py-12 text-gray-500">Chưa có dữ liệu tồn kho.</div>
          )}
        </div>
      </div>
    </div>
  );
}