🛠 Bước 1: Khởi động Database (Dùng Docker)
Không cần cài Postgres vào máy, cũng không cần chạy SQL thủ công. Docker sẽ tự động đọc file init.sql ở thư mục gốc để khởi tạo bảng.

Mở Docker Desktop.

Mở Terminal tại thư mục gốc IS201_PETSTOREERP.

Chạy lệnh:

docker-compose up -d

⚙️ Bước 2: Cài đặt & Chạy Backend
Mở một Terminal mới (Terminal 1) tại thư mục dự án:

Di chuyển vào backend:

cd backend
Cài đặt thư viện: (Lệnh này sẽ tự đọc package.json để tải Express, PG, Cors... về node_modules)

npm install

Cấu hình môi trường:

Tôi có để file .env.example. Copy nó thành file .env.

Kiểm tra thông tin: DB_PASSWORD=password123, DB_NAME=erp_pet.

Chạy Server:

npm run dev
Thấy dòng "Đã kết nối thành công tới Database PostgreSQL!" là thành công.

💻 Bước 3: Cài đặt & Chạy Frontend
Mở thêm một Terminal nữa (Terminal 2) tại thư mục dự án:

Di chuyển vào frontend:

cd frontend
Cài đặt thư viện: (Lệnh này sẽ tải React, Vite, Lucide-react, Recharts... cho giao diện)

npm install
Chạy Giao diện:

npm run dev
Truy cập: Copy link http://localhost:5173 dán vào trình duyệt.
