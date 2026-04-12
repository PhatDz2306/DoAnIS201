import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/authContext';
import Login from './pages/login';
import ProductManager from './pages/productManager'
import InventoryManager from './pages/inventoryManager'
import PosManager from './pages/posManager'
import CustomerManager from './pages/customerManager';
import EmployeeManager from './pages/employeeManager';
import Dashboard from './pages/dashboardManager';
// Tạo một component ảo cho Dashboard để hiển thị tạm

function App() {

  const { user, logout } = useAuth();

  // Lấy đường dẫn hiện tại để đổi tên Header cho linh hoạt
  const location = useLocation();
  const getHeaderTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Bảng Điều Khiển';
    if (location.pathname.includes('/products')) return 'Quản Lý Danh Mục Sản Phẩm';
    if (location.pathname.includes('/inventory')) return 'Quản Lý Tồn Kho';
    if (location.pathname.includes('/pos')) return 'Máy Tính Tiền POS';
    if (location.pathname.includes('/customers')) return 'Khách Hàng & Thú Cưng';
    if (location.pathname.includes('/employees')) return 'Quản Lý Nhân Sự';
    return 'Pet Store ERP';
  };

  if (!user) {
    return <Login />;
  }

  // --- HÀM KIỂM TRA QUYỀN HẠN ---
  const hasPermission = (permission) => {
    if (!user || !user.quyenHan) return false;
    return user.quyenHan.includes('ALL') || user.quyenHan.includes(permission);
  };

  // --- TRẠM TRUNG CHUYỂN: TÌM TRANG MẶC ĐỊNH CHO TỪNG NHÂN VIÊN ---
  const getDefaultRoute = () => {
    if (hasPermission('ALL')) return '/dashboard';
    if (hasPermission('INVENTORY')) return '/inventory';
    if (hasPermission('POS')) return '/pos';
    if (hasPermission('CUSTOMER')) return '/customers';
    // Đề phòng trường hợp lỗi không có quyền nào
    return '/'; 
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* SIDEBAR - Cột Menu bên trái */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 text-2xl font-black border-b border-slate-700 tracking-wider">
          🐾 PET ERP
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto space-y-2">
          
          {/* DASHBOARD: Chỉ còn quyền ALL (Quản lý) mới thấy */}
          {hasPermission('ALL') && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              📊 Tổng Quan (Dashboard)
            </NavLink>
          )}

          {/* QUẢN LÝ SẢN PHẨM: Quyền INVENTORY */}
          {hasPermission('INVENTORY') && (
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              📦 Quản lý Sản phẩm
            </NavLink>
          )}
          
          {/* QUẢN LÝ TỒN KHO: Quyền INVENTORY */}
          {hasPermission('INVENTORY') && (
            <NavLink
              to="/inventory"
              className={({ isActive }) =>
                `w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              🏢 Quản lý Tồn Kho
            </NavLink>
          )}

          {/* POS: Quyền POS */}
          {hasPermission('POS') && (
            <NavLink
              to="/pos"
              className={({ isActive }) =>
                `w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              🛒 Bán Hàng (POS)
            </NavLink>
          )}

          {/* NHÂN SỰ: Quyền ALL */}
          {hasPermission('ALL') && (
            <NavLink
              to="/employees"
              className={({ isActive }) =>
                `w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              👥 Quản lý Nhân sự
            </NavLink>
          )}

          {/* KHÁCH HÀNG: Quyền CUSTOMER */}
          {hasPermission('CUSTOMER') && (
            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              👥 Khách Hàng & Thú Cưng
            </NavLink>
          )}

        </nav>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={logout} 
            className="w-full px-4 py-3 bg-slate-800 hover:bg-red-500 text-white rounded-xl transition-colors font-semibold"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* KHU VỰC NỘI DUNG CHÍNH - Bên phải */}
      <div className="flex-1 flex flex-col h-screen relative">
        
        <header className="h-20 bg-white/80 backdrop-blur-md shadow-sm px-8 flex justify-between items-center border-b border-gray-200 z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {getHeaderTitle()}
          </h2>
          
          <div className="flex items-center space-x-4 cursor-pointer">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{user.hoTen}</p>
              <p className="text-xs text-indigo-600 font-semibold">{user.tenVaiTro}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full border-2 border-white shadow-md"></div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <Routes>
            {/* Khi login vào "/", đá văng về đúng màn hình làm việc của từng người */}
            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
            
            {/* Nếu cố tình gõ link bậy bạ, đá văng về getDefaultRoute() thay vì /dashboard như trước */}
            <Route path="/dashboard" element={hasPermission('ALL') ? <Dashboard /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/products" element={hasPermission('INVENTORY') ? <ProductManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/inventory" element={hasPermission('INVENTORY') ? <InventoryManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/pos" element={hasPermission('POS') ? <PosManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/customers" element={hasPermission('CUSTOMER') ? <CustomerManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/employees" element={hasPermission('ALL') ? <EmployeeManager /> : <Navigate to={getDefaultRoute()} replace />} />
          </Routes>
        </main>
      </div>
      
    </div>
  )
}

export default App