import { useState, useEffect } from 'react';

export default function PosManager() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  // States cho bộ lọc & tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');

  // States cho Khách hàng (Đã gộp chung, bỏ selectedCustomer thừa)
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState(null);

  // States cho Đơn hàng đang Hold & Modal
  const [holdOrderId, setHoldOrderId] = useState(null);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdOrdersList, setHoldOrdersList] = useState([]);
  
  useEffect(() => {
    fetchPosProducts();
  }, []);

  // Lọc sản phẩm ở phía Client
  useEffect(() => {
    let result = products;
    if (category !== 'All') {
      result = result.filter(p => p.loaisanpham === category);
    }
    if (searchTerm) {
      result = result.filter(p => p.tensanpham.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredProducts(result);
  }, [searchTerm, category, products]);

  const fetchPosProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/pos/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };

  // --- TÌM KHÁCH HÀNG ---
  const handleFindCustomer = async () => {
    if (!customerPhone) return;
    try {
      const res = await fetch(`http://localhost:5000/api/pos/customer?sdt=${customerPhone}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data); // Đã tìm thấy, set data vào đây để khóa ô tìm kiếm
      } else {
        alert('Không tìm thấy khách hàng với SĐT này!');
        setCustomer(null);
      }
    } catch (err) {
      console.error('Lỗi tìm khách hàng:', err);
    }
  };

  // --- LẤY DANH SÁCH ĐƠN TREO ---
  const fetchHoldOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/pos/hold-orders');
      const data = await res.json();
      setHoldOrdersList(data);
      setShowHoldModal(true);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn treo:', err);
    }
  };

  // --- QUẢN LÝ GIỎ HÀNG ---
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.masanpham === product.masanpham);
      
      if (product.loaisanpham === 'Hàng hóa') {
        const currentQty = existingItem ? existingItem.soluong : 0;
        if (currentQty >= product.soluongton) {
          alert(`Chỉ còn ${product.soluongton} sản phẩm trong kho!`);
          return prevCart;
        }
      }

      if (existingItem) {
        return prevCart.map(item => 
          item.masanpham === product.masanpham ? { ...item, soluong: item.soluong + 1 } : item
        );
      }
      return [...prevCart, { ...product, soluong: 1 }];
    });
  };

  const decreaseQty = (id) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.masanpham === id && item.soluong > 1) {
        return { ...item, soluong: item.soluong - 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.masanpham !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.gianiemyet * item.soluong), 0);

  // --- CÁC NÚT CHỨC NĂNG CHÍNH ---

  // 1. HOLD: Lưu tạm hóa đơn
  // 1. HOLD: Lưu tạm hóa đơn
  const handleHoldOrder = async () => {
    if (cart.length === 0) return alert('Giỏ hàng trống!');
    if (!customer) return alert("Vui lòng chọn khách hàng trước khi Hold đơn!");
    
    try {
      const res = await fetch('http://localhost:5000/api/pos/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maDoiTac: customer.madoitac, 
          cartItems: cart, 
          tongTien: totalAmount,
          maDonHangHold: holdOrderId // ---> THÊM DÒNG NÀY ĐỂ BACKEND BIẾT LÀ ĐƠN CŨ
        })
      });
      if (res.ok) {
        alert(holdOrderId ? 'Đã cập nhật đơn treo thành công!' : 'Đã lưu đơn hàng (Hold) thành công!');
        resetPos();
      }
    } catch (err) {
      console.error('Lỗi Hold đơn:', err);
    }
  };

  // 2. CANCEL: Hủy đơn hiện tại
  const handleCancel = async () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy giao dịch này?')) {
      if (holdOrderId) {
        await fetch(`http://localhost:5000/api/pos/hold/${holdOrderId}`, { method: 'DELETE' });
      }
      resetPos();
    }
  };

  // MỞ LẠI ĐƠN ĐANG TREO
  const resumeOrder = async (order) => {
    try {
      const res = await fetch(`http://localhost:5000/api/pos/hold-orders/${order.madonhang}`);
      const details = await res.json();
      
      setCustomer({
        madoitac: order.madoitac,
        tendoitac: order.tendoitac,
        sodienthoai: order.sodienthoai
      });
      
      const resumedCart = details.map(d => ({
        masanpham: d.masanpham,
        tensanpham: d.tensanpham,
        gianiemyet: d.dongia,
        soluong: d.soluong,
        loaisanpham: d.loaisanpham
      }));
      
      setCart(resumedCart);
      setHoldOrderId(order.madonhang);
      setShowHoldModal(false);
    } catch (err) {
      console.error('Lỗi khi mở lại đơn:', err);
    }
  };

  // 3. CHECKOUT: Thanh toán
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Giỏ hàng trống!');
    
    // Nếu bạn muốn ép buộc phải có khách hàng mới cho thanh toán thì bật dòng này:
    // if (!customer) return alert("Vui lòng chọn khách hàng để thanh toán và tích điểm!");

    try {
      const res = await fetch('http://localhost:5000/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maDoiTac: customer?.madoitac || null, 
          cartItems: cart, 
          tongTien: totalAmount,
          maDonHangHold: holdOrderId 
        })
      });
      
      if (res.ok) {
        alert('Thanh toán thành công!');
        resetPos();
        fetchPosProducts(); 
      }
    } catch (err) {
      console.error('Lỗi thanh toán:', err);
    }
  };

  const resetPos = () => {
    setCart([]);
    setCustomer(null);
    setCustomerPhone('');
    setHoldOrderId(null);
  };

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100 overflow-hidden font-sans relative">
      
      {/* ================= BÊN TRÁI: DANH SÁCH SẢN PHẨM ================= */}
      <div className="w-2/3 flex flex-col bg-slate-50">
        
        {/* Thanh tìm kiếm & Lọc & Nút xem đơn treo */}
        <div className="p-4 bg-white shadow-sm flex items-center justify-between z-10">
          
          {/* Tabs Lọc */}
          <div className="flex space-x-2">
            {['All', 'Hàng hóa', 'Dịch vụ'].map(cat => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  category === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>

          {/* Ô Tìm kiếm & Nút Xem đơn treo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchHoldOrders} 
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              📋 Đơn đang treo
            </button>
            <div className="relative w-64">
              <input 
                type="text" 
                placeholder="🔍 Tìm tên sản phẩm..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
            </div>
          </div>

        </div>

        {/* Lưới sản phẩm */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <div 
                key={p.masanpham} 
                onClick={() => addToCart(p)}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-transparent hover:border-indigo-400 cursor-pointer overflow-hidden flex flex-col transition-all active:scale-95"
              >
                <div className="h-32 bg-gray-200 w-full">
                  <img 
                    src={p.hinhanh || 'https://placehold.co/300x200?text=No+Image'} 
                    alt={p.tensanpham}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{p.tensanpham}</h3>
                    <span className="text-xs text-gray-400">{p.loaisanpham}</span>
                  </div>
                  <div className="mt-2 flex justify-between items-end">
                    <span className="font-black text-indigo-600">{formatPrice(p.gianiemyet)}</span>
                    {p.loaisanpham === 'Hàng hóa' && (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        Kho: {p.soluongton}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= BÊN PHẢI: GIỎ HÀNG & THANH TOÁN ================= */}
      <div className="w-1/3 bg-white border-l shadow-2xl flex flex-col z-20">
        
        {/* ================= KHU VỰC KHÁCH HÀNG (ĐÃ SỬA LOGIC KHÓA) ================= */}
        <div className="p-4 bg-slate-50 border-b">
          {!customer ? (
            // TRẠNG THÁI 1: CHƯA CÓ KHÁCH HÀNG -> HIỆN Ô TÌM KIẾM
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nhập SĐT khách hàng..." 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              />
              <button 
                onClick={handleFindCustomer}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
              >
                Tìm
              </button>
            </div>
          ) : (
            // TRẠNG THÁI 2: ĐÃ TÌM THẤY KHÁCH HÀNG -> HIỆN THÔNG TIN & NÚT [X]
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex justify-between items-start relative">
              <div>
                <p className="font-bold text-indigo-900 text-sm">👤 {customer.tendoitac}</p>
                <p className="text-xs text-indigo-600 mt-1">SĐT: {customer.sodienthoai}</p>
                <p className="text-xs text-yellow-600 font-bold mt-1">Hạng: {customer.loaikhachhang || 'Đồng'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* Nút X để bỏ chọn khách hàng này */}
                <button 
                  onClick={() => {
                    setCustomer(null);
                    setCustomerPhone('');
                  }}
                  className="w-6 h-6 bg-white border border-gray-200 text-red-500 rounded flex items-center justify-center font-bold text-xs hover:bg-red-50 hover:border-red-200 transition-colors"
                  title="Đổi khách hàng khác"
                >
                  ✕
                </button>
                <div className="text-right mt-1">
                  <p className="text-[10px] text-gray-500 uppercase">Điểm tích lũy</p>
                  <p className="font-black text-indigo-700">{customer.diemtichluy || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Danh sách giỏ hàng */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <span className="text-6xl">🛒</span>
              <p>Chưa có sản phẩm trong giỏ</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.masanpham} className="flex bg-white p-3 rounded-xl shadow-sm border border-gray-100 items-center">
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.tensanpham}</h4>
                  <div className="text-indigo-600 font-semibold text-sm">{formatPrice(item.gianiemyet)}</div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1 mx-2">
                  <button onClick={() => decreaseQty(item.masanpham)} className="w-7 h-7 bg-white rounded shadow-sm font-bold text-gray-600">-</button>
                  <span className="font-bold text-sm w-4 text-center">{item.soluong}</span>
                  <button onClick={() => addToCart(item)} className="w-7 h-7 bg-white rounded shadow-sm font-bold text-gray-600">+</button>
                </div>

                <button 
                  onClick={() => removeFromCart(item.masanpham)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Vùng Tính tiền & Nút Action */}
        <div className="p-4 border-t bg-white">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-bold text-lg">Tổng cộng</span>
            <span className="text-3xl font-black text-indigo-600">{formatPrice(totalAmount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button 
              onClick={handleCancel}
              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              🗑️ Cancel
            </button>
            <button 
              onClick={handleHoldOrder}
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              ⏸️ Hold
            </button>
          </div>

          <button 
            onClick={handleCheckout}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl text-lg shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] transition-transform active:scale-95 flex justify-center items-center gap-2"
          >
            💰 THANH TOÁN
          </button>
        </div>
      </div>

      {/* ================= MODAL DANH SÁCH ĐƠN TREO ================= */}
      {showHoldModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl w-[550px] max-h-[80vh] flex flex-col shadow-2xl">
            <h2 className="text-xl font-black text-gray-800 mb-4 border-b pb-3">📋 Danh sách đơn đang treo</h2>
            
            <div className="overflow-y-auto flex-1 space-y-3 pr-2">
              {holdOrdersList.length === 0 ? (
                <p className="text-center text-gray-500 py-6">Không có đơn hàng nào đang treo.</p>
              ) : (
                holdOrdersList.map(order => (
                  <div key={order.madonhang} className="border border-gray-200 p-4 rounded-xl flex justify-between items-center hover:bg-indigo-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-800">{order.tendoitac} <span className="text-gray-500 text-sm font-normal">({order.sodienthoai})</span></p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(order.ngaytao).toLocaleString('vi-VN')}</p>
                      <p className="text-indigo-600 font-black mt-1">{formatPrice(order.tongtien)}</p>
                    </div>
                    <button 
                      onClick={() => resumeOrder(order)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg shadow-sm transition-transform active:scale-95"
                    >
                      Mở lại
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => setShowHoldModal(false)} 
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}