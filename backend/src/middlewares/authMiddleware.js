const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  // Lấy token từ header 'Authorization: Bearer <token>'
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Truy cập bị từ chối. Không tìm thấy Token!' });
  }

  try {
    const secretKey = process.env.JWT_SECRET || 'my_super_secret_jwt_key';
    const decoded = jwt.verify(token, secretKey);
    
    // Gắn thông tin user đã giải mã vào req để các controller phía sau dùng được
    req.user = decoded; 
    next(); // Cho phép đi tiếp vào Controller
  } catch (err) {
    res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};

// Hàm phụ để kiểm tra xem user có quyền cụ thể hay không
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const userQuyen = req.user.quyenHan; // Mảng quyền, vd: ["ALL"] hoặc ["POS", "CUSTOMER"]
    
    // Nếu có quyền ALL (Quản lý) hoặc chứa quyền yêu cầu thì cho qua
    if (userQuyen.includes('ALL') || userQuyen.includes(requiredPermission)) {
      next();
    } else {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này!' });
    }
  };
};