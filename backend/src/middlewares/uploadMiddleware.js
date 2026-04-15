const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Cấu hình kết nối Cloudinary bằng thông tin trong file .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình nơi lưu trữ (Storage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'san_pham_petshop', // Tên thư mục sẽ tạo trên Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] // Chỉ cho phép up ảnh
  },
});

const upload = multer({ storage: storage });

module.exports = upload;