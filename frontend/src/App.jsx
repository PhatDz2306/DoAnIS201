import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/authContext';
import Login from './pages/login';
import ProductManager from './pages/productManager'
import InventoryManager from './pages/inventoryManager'
import PosManager from './pages/posManager'
import CustomerManager from './pages/customerManager';
import EmployeeManager from './pages/employeeManager';
import Dashboard from './pages/dashboardManager';
import AttendanceManager from './pages/attendanceManager';
import ModulesGrid from './pages/modulesGrid';
import PayrollManager from './pages/payrollManager';
import PendingLeaves from './pages/pendingLeaves';
import WeeklyAttendance from './pages/weeklyAttendance';
// Tạo một component ảo cho Dashboard để hiển thị tạm

function App() {

  const { user, logout } = useAuth();

  // Lấy đường dẫn hiện tại để đổi tên Header cho linh hoạt
  const location = useLocation();
  const navigate = useNavigate();
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

  // --- HÀM KIỂM TRA QUYỀN HẠN (Đã được nâng cấp) ---
  const hasPermission = (permission) => {
    // 1. Nếu không có user hoặc không có trường quyenHan thì chặn luôn
    if (!user || !user.quyenHan) return false;

    // 2. Chuẩn hóa quyenHan về dạng Mảng (Array) để gọi .includes() an toàn
    let permissions = [];
    
    if (Array.isArray(user.quyenHan)) {
      // Trường hợp chuẩn: quyenHan đã là mảng
      permissions = user.quyenHan; 
    } else if (typeof user.quyenHan === 'string') {
      try {
        // Trường hợp backend trả về chuỗi JSON, ví dụ: '["ALL", "INVENTORY"]'
        permissions = JSON.parse(user.quyenHan);
      } catch (error) {
        // Trường hợp backend trả về chuỗi đơn, ví dụ: "ALL"
        permissions = [user.quyenHan];
      }
    }

    // 3. Chốt chặn cuối cùng: Nếu sau khi cố gắng parse mà vẫn không phải mảng, từ chối quyền.
    if (!Array.isArray(permissions)) return false;

    // 4. Kiểm tra quyền
    return permissions.includes('ALL') || permissions.includes(permission);
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
      {/* Left sidebar removed per request; logout placed in header */}

      {/* KHU VỰC NỘI DUNG CHÍNH - Bên phải */}
      <div className="flex-1 flex flex-col h-screen relative">
        
        <header className="h-20 bg-white/80 backdrop-blur-md shadow-sm px-8 flex justify-between items-center border-b border-gray-200 z-10">
            <div className="mr-4">
              <button onClick={() => navigate('/modules')} className="px-3 py-2 bg-indigo-600 text-white rounded-xl">◀ Modules</button>
            </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {getHeaderTitle()}
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{user.hoTen}</p>
              <p className="text-xs text-indigo-600 font-semibold">{user.tenVaiTro}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full border-2 border-white shadow-md"></div>
            <button onClick={logout} className="ml-4 px-3 py-2 bg-red-500 text-white rounded-xl">Đăng xuất</button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <Routes>
            {/* Khi login vào "/", hiển thị trang Modules grid */}
            <Route path="/" element={<Navigate to={'/modules'} replace />} />
            <Route path="/modules" element={<ModulesGrid />} />
            
            {/* Nếu cố tình gõ link bậy bạ, đá văng về getDefaultRoute() thay vì /dashboard như trước */}
            <Route path="/dashboard" element={hasPermission('ALL') ? <Dashboard /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/products" element={hasPermission('INVENTORY') ? <ProductManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/inventory" element={hasPermission('INVENTORY') ? <InventoryManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/pos" element={hasPermission('POS') ? <PosManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/customers" element={hasPermission('CUSTOMER') ? <CustomerManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/employees" element={hasPermission('ALL') ? <EmployeeManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/attendance" element={<AttendanceManager />} />
            <Route path="/payroll" element={hasPermission('PAYROLL') || hasPermission('ALL') ? <PayrollManager /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/hr/leaves/pending" element={hasPermission('ALL') ? <PendingLeaves /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/hr/attendance/weekly" element={hasPermission('ALL') ? <WeeklyAttendance /> : <Navigate to={getDefaultRoute()} replace />} />
          </Routes>
        </main>
      </div>
      
    </div>
  )
}

export default App