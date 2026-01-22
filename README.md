# VAChat

> Hệ thống nhắn tin thời gian thực được xây dựng trên Node.js và Socket.IO

## Mục Lục

- [Giới Thiệu](#giới-thiệu)
- [Tính Năng](#tính-năng)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt](#cài-đặt)
- [Cấu Hình Môi Trường](#cấu-hình-môi-trường)
- [Scripts](#scripts)
- [Sử Dụng](#sử-dụng)
- [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Gợi Ý Triển Khai](#gợi-ý-triển-khai)
- [Troubleshooting](#troubleshooting)
- [Nhóm Phát Triển](#nhóm-phát-triển)

## Giới Thiệu

VAChat là một ứng dụng nhắn tin trực tuyến hiện đại, cho phép người dùng giao tiếp tức thời thông qua tin nhắn văn bản. Dự án được phát triển dựa trên kiến trúc Client-Server, sử dụng giao thức TCP/IP để đảm bảo độ tin cậy trong truyền tải dữ liệu.

## Tính Năng

- **Xác thực người dùng**: Hệ thống đăng ký và đăng nhập an toàn với mã hóa mật khẩu
- **Trò chuyện riêng tư**: Nhắn tin trực tiếp với bạn bè theo thời gian thực
- **Trò chuyện nhóm**: Tạo và quản lý nhóm chat với nhiều thành viên
- **Quản lý bạn bè**: Tìm kiếm, gửi lời mời và quản lý danh sách bạn bè
- **Thông báo tức thì**: Nhận thông báo khi có tin nhắn mới hoặc lời mời kết bạn
- **Giao diện thân thiện**: Thiết kế responsive tối ưu cho mọi thiết bị

## Kiến Trúc Hệ Thống

Hệ thống sử dụng mô hình **Client-Server** với các thành phần chính:

### Backend
- **Framework**: Express.js (Node.js)
- **Real-time Engine**: Socket.IO (WebSocket over TCP)
- **Database**: MongoDB với Mongoose ODM
- **Session Management**: Express-Session với MongoDB Store

### Frontend
- **Template Engine**: EJS (Embedded JavaScript)
- **Styling**: CSS3
- **Client Logic**: Vanilla JavaScript (ES6 Modules)

### Giao Thức Truyền Thông
- **HTTP/HTTPS**: Xử lý các request API và render trang
- **WebSocket**: Kênh giao tiếp hai chiều cho tin nhắn thời gian thực (chạy trên TCP)

## Yêu Cầu Hệ Thống

- **Node.js**: v14.0.0 trở lên
- **MongoDB**: v4.0 trở lên (hoặc MongoDB Atlas)
- **npm**: v6.0.0 trở lên

## Cài Đặt

### 1. Sao Chép Mã Nguồn

```bash
git clone https://github.com/your-username/VAChat.git
cd VAChat
```

### 2. Cài Đặt Dependencies

```bash
npm install
```

### 3. Khởi Động Database

Đảm bảo MongoDB đang chạy trên máy local hoặc đã thiết lập kết nối đến MongoDB Atlas.

```bash
# Nếu sử dụng MongoDB local
mongod
```

### 4. Cấu Hình Môi Trường

Tạo file `.env` trong thư mục gốc của dự án:

```env
MONGO_URI=mongodb://localhost:27017/vachat
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret
CHAT_SECRET=your_chat_secret
```

**Giải thích biến môi trường**:
- `MONGO_URI`: Connection string MongoDB
- `PORT`: Cổng chạy server (mặc định 3000)
- `NODE_ENV`: `development` hoặc `production`
- `SESSION_SECRET`: Khóa ký session
- `CHAT_SECRET`: Khóa dùng mã hóa nội dung chat

## Sử Dụng

### Chế Độ Development

```bash
npm run dev
```

Server sẽ tự động khởi động lại khi phát hiện thay đổi trong mã nguồn.

### Chế Độ Production

```bash
npm start
```

## Scripts

- `npm run dev`: chạy server với nodemon
- `npm start`: chạy server chế độ production

## Tài Liệu Kỹ Thuật

- Xem luồng xử lý và kiến trúc chi tiết tại [CODING_FLOW.md](CODING_FLOW.md)

### Truy Cập Ứng Dụng

Mở trình duyệt và truy cập: `http://localhost:3000`

## Hướng Dẫn Sử Dụng

1. **Đăng ký tài khoản**: Nhấp vào "Đăng ký" và điền thông tin cá nhân
2. **Đăng nhập**: Sử dụng email và mật khẩu đã đăng ký
3. **Tìm kiếm bạn bè**: Sử dụng thanh tìm kiếm để tìm người dùng theo username
4. **Gửi lời mời kết bạn**: Nhấp "Gửi kết bạn" trên hồ sơ người dùng
5. **Chấp nhận lời mời**: Kiểm tra thông báo và chấp nhận lời mời kết bạn
6. **Bắt đầu trò chuyện**: Chọn bạn bè từ danh sách để bắt đầu nhắn tin
7. **Tạo nhóm chat**: Nhấp "Tạo nhóm mới", chọn thành viên và đặt tên nhóm

## Cấu Trúc Dự Án

```
VAChat/
├── src/
│   ├── config/          # Cấu hình database, session, middleware
│   ├── controllers/     # Xử lý logic điều khiển
│   ├── middleware/      # Middleware xác thực và xử lý lỗi
│   ├── models/          # Schema MongoDB
│   ├── routes/          # Định nghĩa API endpoints
│   ├── services/        # Business logic layer
│   ├── utils/           # Tiện ích và helper functions
│   ├── public/          # Static assets (CSS, JS, images)
│   ├── view/            # EJS templates
│   └── server.js        # Entry point
├── .env                 # Biến môi trường
├── package.json         # Dependencies và scripts
└── README.md           # Tài liệu dự án
```

## Gợi Ý Triển Khai

- **Reverse Proxy**: Dùng Nginx để proxy tới Node.js
- **HTTPS**: Bật SSL cho môi trường production
- **MongoDB Atlas**: Dễ triển khai và quản lý hơn MongoDB local
- **Giám sát**: Dùng PM2 để chạy server và auto-restart

## Troubleshooting

- **Không kết nối được DB**: Kiểm tra `MONGO_URI` và trạng thái MongoDB
- **Socket không hoạt động**: Kiểm tra port và firewall; đảm bảo client kết nối đúng host
- **Session bị reset**: Kiểm tra `SESSION_SECRET` có đổi giữa các lần deploy hay không
- **Lỗi môi trường**: Kiểm tra lại file `.env` và quyền đọc file

## Nhóm Phát Triển

- **Đỗ Hoài Anh**
- **Trương Văn Triều Vĩ**
