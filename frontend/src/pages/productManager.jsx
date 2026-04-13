import { useState, useEffect } from 'react';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    tenSanPham: '',
    loaiSanPham: 'Hàng hóa',
    donViTinh: 'Cái',
    giaNiemYet: '',
    coTheMua: true,
    coTheBan: true,
    hinhAnh: '' 
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ tenSanPham: '', loaiSanPham: 'Hàng hóa', donViTinh: 'Cái', giaNiemYet: '', coTheMua: true, coTheBan: true, hinhAnh: '' });
    setIsDrawerOpen(true);
  };

  const handleEditClick = (product) => {
    setEditingId(product.masanpham);
    setFormData({
      tenSanPham: product.tensanpham,
      loaiSanPham: product.loaisanpham || 'Hàng hóa',
      donViTinh: product.donvitinh || 'Cái',
      giaNiemYet: product.gianiemyet,
      coTheMua: product.cothemua,
      coTheBan: product.cotheban,
      hinhAnh: product.hinhanh || ''
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
        if(!isDrawerOpen) setEditingId(null)
    }, 300); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId 
      ? `http://localhost:5000/api/products/${editingId}` 
      : 'http://localhost:5000/api/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        handleCloseDrawer();
        fetchProducts();
      }
    } catch (error) {
      console.error('Lỗi:', error);
    }
  };

  // Cập nhật trạng thái trực tiếp trên thẻ
  // Cập nhật trạng thái trực tiếp trên thẻ
  const toggleStatus = async (id, field, currentValue) => {
    const product = products.find(p => p.masanpham === id);
    if (!product) return;

    // Chuẩn bị payload khớp với req.body mà backend cần
    const payload = {
        tenSanPham: product.tensanpham,
        loaiSanPham: product.loaisanpham,
        donViTinh: product.donvitinh,
        giaNiemYet: product.gianiemyet,
        coTheMua: field === 'coTheMua' ? !currentValue : product.cothemua,
        coTheBan: field === 'coTheBan' ? !currentValue : product.cotheban,
        hinhAnh: product.hinhanh
    };

    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
          // LỖI NẰM Ở ĐÂY ĐÃ ĐƯỢC FIX: 
          // Database dùng chữ thường (cotheban) nên phải toLowerCase() cái field (coTheBan) đi
          const dbField = field.toLowerCase(); 
          setProducts(products.map(p => 
            p.masanpham === id ? { ...p, [dbField]: !currentValue } : p
          ));
      }
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price || 0) + 'đ';

  const filteredProducts = products.filter(p => 
    p.tensanpham.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto bg-[#f5f7f9] min-h-screen font-sans relative overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Danh mục sản phẩm</h2>
          <p className="text-slate-500 max-w-lg">Quản lý danh sách hàng hóa và dịch vụ cho cửa hàng.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" 
              placeholder="Tìm tên sản phẩm..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
            />
          </div>
          <button 
            onClick={handleAddClick}
            className="bg-gradient-to-br from-indigo-600 to-indigo-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>➕</span> Thêm mới
          </button>
        </div>
      </div>

      {/* GRID PRODUCTS - Các thẻ nhỏ hơn và bo góc nhiều hơn */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredProducts.map((p) => (
          <div key={p.masanpham} className="bg-white border border-slate-100 rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col relative">
            
            <div className="relative h-40 bg-slate-50 flex items-center justify-center overflow-hidden">
              {p.hinhanh ? (
                  <img src={p.hinhanh} alt={p.tensanpham} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                  <div className="text-slate-300 font-medium text-sm flex flex-col items-center">
                      <span className="text-2xl mb-1">📦</span>
                      No Image
                  </div>
              )}
              
              <div className={`absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${p.loaisanpham === 'Hàng hóa' ? 'text-indigo-600' : 'text-pink-600'}`}>
                {p.loaisanpham}
              </div>
              <button 
                onClick={() => handleEditClick(p)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-700 hover:bg-indigo-600 hover:text-white transition-colors shadow-sm"
              >
                ✏️
              </button>
            </div>
            
            <div className="p-4 flex flex-col flex-1">
              {/* Cho phép hiển thị tối đa 2 dòng nếu tên dài */}
              <h3 className="font-bold text-slate-800 text-[15px] leading-tight mb-2 line-clamp-2 min-h-[38px]" title={p.tensanpham}>
                  {p.tensanpham}
              </h3>
              
              {/* Tìm đoạn này trong file productManager.jsx và thay thế */}
            <div className="flex justify-between items-end mb-4">
                <span className="text-indigo-600 font-black text-lg">{formatPrice(p.gianiemyet)}</span>
                <div className="text-right">
                    <span className="block text-slate-400 text-xs font-medium">/{p.donvitinh || 'SP'}</span>
                    
                    {/* CHỈ HIỂN THỊ KHO NẾU KHÔNG PHẢI LÀ DỊCH VỤ */}
                    {p.loaisanpham !== 'Dịch vụ' && (
                        <span className="block text-[11px] font-bold text-slate-500 mt-1">
                            Kho: <span className={p.soluongton > 0 ? "text-emerald-600" : "text-red-500"}>
                                {p.soluongton}
                            </span>
                        </span>
                    )}
                    
                    {/* NẾU LÀ DỊCH VỤ, CÓ THỂ HIỂN THỊ TRẠNG THÁI SẴN SÀNG (TÙY CHỌN) */}
                    {p.loaisanpham === 'Dịch vụ' && (
                        <span className="block text-[11px] font-bold text-indigo-400 mt-1 uppercase tracking-tighter">
                            Sẵn sàng
                        </span>
                    )}
                </div>
            </div>
              
              <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase tracking-wide ${p.cotheban ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {p.cotheban ? 'Đang bán (POS)' : 'Đã ẩn (POS)'}
                </span>
                
                <div 
                  onClick={() => toggleStatus(p.masanpham, 'coTheBan', p.cotheban)}
                  className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-300 ${p.cotheban ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${p.cotheban ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          Không tìm thấy sản phẩm nào.
        </div>
      )}

      {/* --- SLIDE-OVER DRAWER --- */}
      {/* Overlay mượt mà */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={handleCloseDrawer}
      ></div>

      {/* Panel trượt */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
              {editingId ? `Mã SP: #${editingId}` : 'Nhập thông tin chi tiết'}
            </p>
          </div>
          <button onClick={handleCloseDrawer} className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-5 flex-1">
            
            {/* Hình ảnh */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Link Ảnh (URL)</label>
              <input 
                name="hinhAnh" value={formData.hinhAnh} onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 text-sm" 
                placeholder="https://example.com/image.jpg" type="text"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tên sản phẩm *</label>
              <input 
                name="tenSanPham" value={formData.tenSanPham} onChange={handleChange} required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium text-sm" 
                placeholder="Ví dụ: Cát vệ sinh cho mèo..." type="text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Loại sản phẩm</label>
                <select 
                  name="loaiSanPham" value={formData.loaiSanPham} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium text-sm"
                >
                  <option value="Hàng hóa">Hàng hóa</option>
                  <option value="Dịch vụ">Dịch vụ</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Đơn vị tính</label>
                <input 
                  name="donViTinh" value={formData.donViTinh} onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium text-sm" 
                  placeholder="Cái, Gói, Lần..." type="text"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Giá niêm yết (VNĐ) *</label>
              <div className="relative">
                <input 
                  name="giaNiemYet" value={formData.giaNiemYet} onChange={handleChange} required min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-indigo-600 text-sm" 
                  type="number" placeholder="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
              </div>
            </div>

            {/* Khung Toggles Tùy chọn */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
              {formData.loaiSanPham !== 'Dịch vụ' && (
                <>
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setFormData({...formData, coTheMua: !formData.coTheMua})}>
                    <div>
                      <span className="block text-sm font-bold text-slate-700">Cho phép Nhập kho</span>
                      <span className="text-[10px] text-slate-500">Hiển thị trong module nhập hàng</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${formData.coTheMua ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${formData.coTheMua ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-200 w-full"></div>
                </>
              )}

              <div className="flex justify-between items-center cursor-pointer" onClick={() => setFormData({...formData, coTheBan: !formData.coTheBan})}>
                <div>
                  <span className="block text-sm font-bold text-slate-700">Cho phép Bán (POS)</span>
                  <span className="text-[10px] text-slate-500">Hiển thị màn hình bán hàng</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${formData.coTheBan ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${formData.coTheBan ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 bg-white flex gap-3">
            <button 
              type="button" 
              onClick={handleCloseDrawer} 
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="flex-[2] py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {editingId ? 'Lưu Thay Đổi' : 'Tạo Sản Phẩm'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}