import { useState, useEffect } from 'react';

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States Modal Khách Hàng
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCus, setNewCus] = useState({ name: '', phone: '', address: '' });

  // States Modal Thú Cưng
  const [showPetModal, setShowPetModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pets, setPets] = useState([]);
  
  // Khớp với Database: Tên, Loại, Giới Tính (true: Đực, false: Cái)
  const [newPet, setNewPet] = useState({ tenThuCung: '', loaiThuCung: '', gioiTinh: 'true' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Lỗi tải KH:', err);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCus)
      });
      if (res.ok) {
        setShowAddCustomer(false);
        setNewCus({ name: '', phone: '', address: '' });
        fetchCustomers();
      } else {
        alert('Có lỗi xảy ra khi thêm khách hàng!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openPetModal = async (customer) => {
    setSelectedCustomer(customer);
    setShowPetModal(true);
    fetchPets(customer.madoitac);
  };

  const fetchPets = async (maDoiTac) => {
    try {
      const res = await fetch(`http://localhost:5000/api/customers/${maDoiTac}/pets`);
      if (res.ok) {
        const data = await res.json();
        setPets(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    try {
      // Chuyển string 'true'/'false' thành boolean cho DB
      const isMale = newPet.gioiTinh === 'true'; 

      const res = await fetch(`http://localhost:5000/api/customers/${selectedCustomer.madoitac}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maDoiTac: selectedCustomer.madoitac,
          tenThuCung: newPet.tenThuCung,
          loaiThuCung: newPet.loaiThuCung,
          gioiTinh: isMale
        })
      });
      if (res.ok) {
        setNewPet({ tenThuCung: '', loaiThuCung: '', gioiTinh: 'true' });
        fetchPets(selectedCustomer.madoitac); // Gọi lại danh sách thú cưng
      } else {
        alert('Có lỗi xảy ra khi thêm thú cưng!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.tendoitac?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.sodienthoai && c.sodienthoai.includes(searchTerm))
  );

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffafa] to-[#faefef] p-8 font-sans text-gray-800">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-1">Quản lý Khách Hàng</p>
          <h1 className="text-3xl font-black text-[#4a3f3f]">Khách hàng & Thú cưng</h1>
        </div>
        <button 
          onClick={() => setShowAddCustomer(true)}
          className="bg-[#d4b972] hover:bg-[#c2a65a] text-white font-bold py-3 px-6 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Thêm Khách Hàng
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 text-xl">👥</div>
            <div>
              <p className="text-sm text-gray-400 font-semibold mb-1">Tổng khách hàng</p>
              <p className="text-2xl font-black text-[#4a3f3f]">{customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-pink-50 min-h-[500px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#4a3f3f]">Danh sách Khách hàng</h2>
          <div className="relative w-80">
            <input 
              type="text" 
              placeholder="🔍 Tìm theo tên hoặc SĐT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-100 rounded-xl focus:outline-none focus:border-[#d4b972] bg-gray-50 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 tracking-wider uppercase">
                <th className="pb-4 pl-2">Khách Hàng</th>
                <th className="pb-4">Số Điện Thoại</th>
                <th className="pb-4 text-center">Số Đơn</th>
                <th className="pb-4 text-right">Tổng Chi Tiêu</th>
                <th className="pb-4 text-center">Điểm Tích Lũy</th>
                <th className="pb-4 text-right pr-2">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => (
                <tr key={c.madoitac} className="border-b border-gray-50 hover:bg-[#fffcfc] transition-colors group">
                  <td className="py-4 pl-2 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                      {c.tendoitac?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#4a3f3f]">{c.tendoitac}</p>
                      <p className="text-xs text-gray-400">ID: C-{c.madoitac.toString().padStart(4, '0')} | {c.loaikhachhang}</p>
                    </div>
                  </td>
                  <td className="py-4 text-gray-600 text-sm font-medium">{c.sodienthoai || 'N/A'}</td>
                  <td className="py-4 text-center font-bold text-[#4a3f3f]">{c.total_orders}</td>
                  <td className="py-4 text-right font-black text-[#4a3f3f]">{formatPrice(c.total_spent)}</td>
                  <td className="py-4 text-center">
                    <span className="bg-yellow-50 text-yellow-700 font-bold px-3 py-1 rounded-lg text-xs">
                      ⭐ {c.diemtichluy}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-2">
                    <button 
                      onClick={() => openPetModal(c)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-4 py-2 rounded-lg text-sm"
                    >
                      🐾 Xem Hồ Sơ Thú Cưng
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">Không tìm thấy khách hàng nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: THÊM KHÁCH HÀNG ================= */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl w-[450px] shadow-2xl border border-pink-100">
            <h2 className="text-2xl font-black text-[#4a3f3f] mb-6">Thêm Khách Hàng Mới</h2>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Tên khách hàng</label>
                <input required type="text" value={newCus.name} onChange={e => setNewCus({...newCus, name: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4b972]" placeholder="VD: Nguyễn Văn A"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Số điện thoại</label>
                <input required type="text" value={newCus.phone} onChange={e => setNewCus({...newCus, phone: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4b972]" placeholder="VD: 0912345678"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Địa chỉ</label>
                <input type="text" value={newCus.address} onChange={e => setNewCus({...newCus, address: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4b972]" placeholder="VD: 123 Lê Lợi, Q1"/>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowAddCustomer(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200">Hủy</button>
                <button type="submit" className="flex-1 bg-[#d4b972] text-white font-bold py-3 rounded-xl hover:bg-[#c2a65a]">Lưu Khách Hàng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: HỒ SƠ THÚ CƯNG ================= */}
      {showPetModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-[800px] flex overflow-hidden shadow-2xl">
            
            {/* Cột trái: Danh sách thú cưng */}
            <div className="w-1/2 bg-gray-50 p-8 border-r">
              <h2 className="text-xl font-black text-[#4a3f3f] mb-1">Hồ Sơ Thú Cưng</h2>
              <p className="text-sm text-gray-500 mb-6">Chủ nuôi: <span className="font-bold text-[#d4b972]">{selectedCustomer.tendoitac}</span></p>
              
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                {pets.length === 0 ? (
                  <p className="text-gray-400 italic text-sm text-center py-10">Khách hàng chưa có thú cưng nào.</p>
                ) : (
                  pets.map(p => (
                    <div key={p.mathucung} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex justify-center items-center text-2xl">
                        {p.loaithucung?.toLowerCase().includes('mèo') ? '🐱' : '🐶'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{p.tenthucung}</p>
                        <p className="text-xs text-gray-500">
                          {p.loaithucung} • {p.gioitinh ? 'Đực ♂' : 'Cái ♀'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cột phải: Form thêm thú cưng (Sửa khớp Database) */}
            <div className="w-1/2 p-8 bg-white">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Thêm Thú Cưng Mới</h3>
                <button onClick={() => setShowPetModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
              </div>
              
              <form onSubmit={handleAddPet} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Tên thú cưng</label>
                  <input required type="text" value={newPet.tenThuCung} onChange={e => setNewPet({...newPet, tenThuCung: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:outline-none focus:border-[#d4b972] text-sm" placeholder="VD: Mực"/>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Loài (Chó/Mèo...)</label>
                  <input type="text" value={newPet.loaiThuCung} onChange={e => setNewPet({...newPet, loaiThuCung: e.target.value})} className="w-full border rounded-xl px-4 py-3 bg-gray-50 text-sm focus:outline-none focus:border-[#d4b972]" placeholder="VD: Chó Poodle"/>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Giới tính</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gioiTinh" value="true" checked={newPet.gioiTinh === 'true'} onChange={e => setNewPet({...newPet, gioiTinh: e.target.value})} className="accent-[#d4b972]"/>
                      <span className="text-sm font-medium">Đực</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gioiTinh" value="false" checked={newPet.gioiTinh === 'false'} onChange={e => setNewPet({...newPet, gioiTinh: e.target.value})} className="accent-[#d4b972]"/>
                      <span className="text-sm font-medium">Cái</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#4a3f3f] text-white font-bold py-3 rounded-xl mt-6 hover:bg-black transition-colors">
                  + Lưu Thú Cưng
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}