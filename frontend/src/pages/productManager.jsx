import { useState, useEffect } from 'react';

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null); // Lưu ID sản phẩm đang sửa
  const [formData, setFormData] = useState({
    tenSanPham: '',
    loaiSanPham: 'Hàng hóa',
    donViTinh: '',
    giaNiemYet: '',
    coTheMua: true,
    coTheBan: true
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

  // Hàm đổ dữ liệu vào Form để sửa
  const handleEditClick = (product) => {
    setEditingId(product.masanpham);
    setFormData({
      tenSanPham: product.tensanpham,
      loaiSanPham: product.loaisanpham,
      donViTinh: product.donvitinh || '',
      giaNiemYet: product.gianiemyet,
      coTheMua: product.cothemua,
      coTheBan: product.cotheban
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Cuộn lên đầu trang để sửa
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ tenSanPham: '', loaiSanPham: 'Hàng hóa', donViTinh: '', giaNiemYet: '', coTheMua: true, coTheBan: true });
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
        alert(editingId ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        handleCancelEdit();
        fetchProducts();
      }
    } catch (error) {
      console.error('Lỗi:', error);
    }
  };

  // Hàm cập nhật nhanh trạng thái Bán/Mua mà không cần mở form
  const toggleStatus = async (id, field, currentValue) => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ...products.find(p => p.masanpham === id), 
            [field]: !currentValue 
        })
      });
      if (response.ok) fetchProducts();
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">📦 Quản lý Sản phẩm & Dịch vụ</h1>

      {/* FORM: Dùng chung cho cả Thêm và Sửa */}
      <div className={`p-6 rounded-xl shadow-md mb-8 border transition-all ${editingId ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-100'}`}>
        <h2 className="text-xl font-semibold mb-4 text-indigo-600">
          {editingId ? ` đang chỉnh sửa: ${formData.tenSanPham}` : 'Thêm Mới Sản Phẩm'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Tên sản phẩm</label>
            <input type="text" name="tenSanPham" required value={formData.tenSanPham} onChange={handleChange} className="border rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Loại</label>
            <select name="loaiSanPham" value={formData.loaiSanPham} onChange={handleChange} className="border rounded-lg p-2 outline-none">
              <option value="Hàng hóa">Hàng hóa</option>
              <option value="Dịch vụ">Dịch vụ</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Giá niêm yết</label>
            <input type="number" name="giaNiemYet" required value={formData.giaNiemYet} onChange={handleChange} className="border rounded-lg p-2 outline-none" />
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" name="coTheMua" checked={formData.coTheMua} onChange={handleChange} className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">Có thể nhập</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" name="coTheBan" checked={formData.coTheBan} onChange={handleChange} className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-700">Có thể bán (POS)</span>
            </label>
          </div>
          <div className="flex items-end space-x-2">
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
              {editingId ? 'Cập Nhật' : 'Lưu Mới'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="bg-gray-400 hover:bg-gray-500 text-white py-2 px-4 rounded-lg">
                Hủy
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLE DANH SÁCH */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sản phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Giá</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng thái bán</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((p) => (
              <tr key={p.masanpham} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{p.tensanpham}</div>
                  <div className="text-xs text-gray-400">{p.loaisanpham} - {p.donvitinh}</div>
                </td>
                <td className="px-6 py-4 font-semibold">
                    {new Intl.NumberFormat('vi-VN').format(p.gianiemyet)}đ
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleStatus(p.masanpham, 'coTheBan', p.cotheban)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${p.cotheban ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  >
                    {p.cotheban ? '● Đang bán (Hiện ở POS)' : '○ Ngừng bán (Ẩn khỏi POS)'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEditClick(p)} className="text-indigo-600 hover:text-indigo-900 font-medium">Sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}