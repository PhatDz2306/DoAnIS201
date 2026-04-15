import { useState, useEffect, useRef } from 'react';

export default function InventoryManager() {
  const [inventory, setInventory] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [importForm, setImportForm] = useState({ masanpham: '', soluong: '', dongia: '' });
  
  // --- STATES CHO KIỂM KÊ KHO ---
  const [checkItems, setCheckItems] = useState([]); // [{ masanpham, tensanpham, slhethong, slthucte, lydolech }]

  // --- STATES CHO TÍNH NĂNG TÌM KIẾM SẢN PHẨM ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null); 

  useEffect(() => {
    fetchInventory();
    
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
        setImportForm({ masanpham: '', soluong: '', dongia: '' });
        setSearchQuery('');
        setIsImporting(false);
        fetchInventory(); 
      }
    } catch (err) {
      console.error('Lỗi nhập kho:', err);
    }
  };

  // --- LOGIC KIỂM KÊ KHO ---
  const handleAddToCheckList = (product) => {
    if (checkItems.some(item => item.masanpham === product.masanpham)) {
      return alert('Sản phẩm này đã có trong danh sách kiểm kê!');
    }
    setCheckItems([...checkItems, {
      masanpham: product.masanpham,
      tensanpham: product.tensanpham,
      slhethong: product.soluongton,
      slthucte: product.soluongton,
      lydolech: ''
    }]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleUpdateCheckItem = (index, field, value) => {
    const newItems = [...checkItems];
    newItems[index][field] = value;
    setCheckItems(newItems);
  };

  const handleRemoveCheckItem = (index) => {
    setCheckItems(checkItems.filter((_, i) => i !== index));
  };

  const handleCheckSubmit = async () => {
    if (checkItems.length === 0) return alert('Vui lòng thêm ít nhất một sản phẩm để kiểm kê!');
    
    const token = localStorage.getItem('token');
    const payload = {
      items: checkItems.map(item => ({
        masanpham: item.masanpham,
        slthucte: parseInt(item.slthucte),
        lydolech: item.lydolech
      }))
    };

    try {
      const res = await fetch('http://localhost:5000/api/inventory/check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Kiểm kê kho thành công! Số lượng tồn kho đã được cập nhật.');
        setCheckItems([]);
        setIsChecking(false);
        fetchInventory();
      } else {
        const errorData = await res.json();
        alert('Lỗi: ' + errorData.error);
      }
    } catch (err) {
      console.error('Lỗi kiểm kê kho:', err);
    }
  };

  // --- LỌC DANH SÁCH TÌM KIẾM ---
  const filteredInventory = inventory.filter(item => {
    if (isImporting && !item.cothemua) return false; 
    if (!searchQuery) return true;
    return item.tensanpham.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.masanpham.toString().includes(searchQuery);
  });

  const handleSelectProduct = (product) => {
    if (isImporting) {
      setImportForm({ ...importForm, masanpham: product.masanpham });
      setSearchQuery(product.tensanpham);
      setShowDropdown(false);
    } else if (isChecking) {
      handleAddToCheckList(product);
    }
  };

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
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setIsChecking(!isChecking);
              setIsImporting(false);
              setSearchQuery('');
              setCheckItems([]);
            }}
            className={`${isChecking ? 'bg-gray-500' : 'bg-emerald-600'} hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2`}
          >
            {isChecking ? '✕ Hủy kiểm kê' : '🔍 Kiểm kê kho'}
          </button>
          <button 
            onClick={() => {
              setIsImporting(!isImporting);
              setIsChecking(false);
              setSearchQuery('');
              setImportForm({ masanpham: '', soluong: '', dongia: '' });
            }}
            className={`${isImporting ? 'bg-gray-500' : 'bg-indigo-600'} hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2`}
          >
            {isImporting ? '✕ Đóng biểu mẫu' : '➕ Tạo Phiếu Nhập Kho'}
          </button>
        </div>
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

      {/* SEARCH DROPDOWN COMPONENT (REUSABLE) */}
      {(isImporting || isChecking) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-indigo-100 overflow-visible relative">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-indigo-600">{isImporting ? '📥' : '🔍'}</span> 
            {isImporting ? 'Nhập hàng mới vào kho' : 'Chọn sản phẩm để kiểm kê'}
          </h2>
          
          <div className="relative mb-6" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm & Chọn sản phẩm</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="🔍 Nhập tên hoặc mã sản phẩm..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (isImporting) setImportForm({ ...importForm, masanpham: '' });
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50"
              />
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

          {/* FORM NHẬP KHO */}
          {isImporting && (
            <form onSubmit={handleImportSubmit} className="flex gap-4 items-end">
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                <input type="number" min="1" value={importForm.soluong} onChange={e => setImportForm({...importForm, soluong: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50" required />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá nhập</label>
                <input type="number" min="0" value={importForm.dongia} onChange={e => setImportForm({...importForm, dongia: e.target.value})} className="w-full border border-gray-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50" required />
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Lưu Phiếu</button>
            </form>
          )}

          {/* FORM KIỂM KÊ (MULTI-ITEM) */}
          {isChecking && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-3">Danh sách sản phẩm kiểm kê:</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="text-left py-2">Sản phẩm</th>
                      <th className="text-center py-2 w-24">Hệ thống</th>
                      <th className="text-center py-2 w-32">Thực tế</th>
                      <th className="text-center py-2 w-24">Lệch</th>
                      <th className="text-left py-2">Lý do lệch</th>
                      <th className="text-center py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkItems.map((item, index) => {
                      const lech = (parseInt(item.slthucte) || 0) - item.slhethong;
                      return (
                        <tr key={item.masanpham} className="border-b">
                          <td className="py-3 font-medium text-gray-800">{item.tensanpham}</td>
                          <td className="py-3 text-center">{item.slhethong}</td>
                          <td className="py-3 px-2">
                            <input 
                              type="number" 
                              min="0"
                              value={item.slthucte}
                              onChange={(e) => handleUpdateCheckItem(index, 'slthucte', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-1.5 text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </td>
                          <td className={`py-3 text-center font-bold ${lech === 0 ? 'text-gray-400' : lech > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {lech > 0 ? `+${lech}` : lech}
                          </td>
                          <td className="py-3 px-2">
                            <input 
                              type="text" 
                              placeholder="Ghi chú lý do..."
                              value={item.lydolech}
                              onChange={(e) => handleUpdateCheckItem(index, 'lydolech', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-1.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </td>
                          <td className="py-3 text-center">
                            <button onClick={() => handleRemoveCheckItem(index)} className="text-red-400 hover:text-red-600 text-lg">✕</button>
                          </td>
                        </tr>
                      );
                    })}
                    {checkItems.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-400 italic">Chọn sản phẩm từ ô tìm kiếm phía trên để bắt đầu kiểm kê</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-6">
                <button 
                  onClick={handleCheckSubmit}
                  className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-md transition-all"
                >
                  Hoàn Thành Kiểm Kê & Cập Nhật Kho
                </button>
              </div>
            </div>
          )}
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
