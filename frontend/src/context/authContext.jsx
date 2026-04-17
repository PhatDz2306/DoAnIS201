import React, { createContext, useState, useEffect, useContext } from 'react';

// Tạo Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra token trong localStorage khi tải lại trang.
  // Nếu đang chạy trên localhost thì tự động xóa để buộc đăng nhập lại (dev convenience).
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
      return;
    }
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Hàm xử lý khi đăng nhập thành công
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  // Hàm đăng xuất
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải dữ liệu...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook để dùng cho tiện
export const useAuth = () => useContext(AuthContext);