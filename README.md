# AVChat

Ứng dụng chat nhẹ (Express + Socket.IO + MongoDB). Hỗ trợ danh sách bạn bè, nhóm, lưu lịch sử tin nhắn và nhắn tin realtime. Một số tính năng AI có trong mã nhưng hiện đã bị vô hiệu hoá trên nhánh này.

Mục lục
- Giới thiệu
- Yêu cầu
- Cài đặt & chạy
- Biến môi trường
- Ghi chú bảo mật
- Cấu trúc dự án
- Khắc phục sự cố nhanh

Giới thiệu
---------
AVChat là ví dụ minh hoạ hệ thống chat client–server: server dùng Express + Socket.IO, client là các view EJS với JS phía client (fetch + socket). Tin nhắn được lưu trong MongoDB (mã hoá AES).

Yêu cầu
-------
- Node.js >= 18
- npm
- MongoDB (Atlas hoặc self-hosted)

Cài đặt & chạy
--------------
1. Cài phụ thuộc:
   npm install

2. Tạo file `.env` ở gốc dự án (không commit file này). Ví dụ tối thiểu:
   MONGO_URI=your_mongo_uri
   PORT=1505
   SESSION_SECRET=your_session_secret

3. Chạy môi trường phát triển:
   npm run dev

Biến môi trường chính
----------------------
- MONGO_URI — chuỗi kết nối MongoDB (bắt buộc để dùng DB).
- PORT — cổng server (mặc định 3000/1505).
- SESSION_SECRET — secret cho express-session.
- CHAT_SECRET — khóa AES cho mã hóa tin nhắn (nên đặt trong prod).
- GEMINI_API_KEY / SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS — cấu hình AI (không bắt buộc; AI có thể bị vô hiệu hóa).

Ghi chú bảo mật
---------------
- KHÔNG commit file `.env` chứa secrets. Sử dụng secret manager cho production.
- Nếu MONGO_URI không được cấu hình, app sẽ dùng in-memory session store (không an toàn cho production).
- Ai features trong mã có thể bị tắt — README và server log sẽ thông báo.

Cấu trúc dự án (chính)
-----------------------
- src/server.js — entrypoint
- src/config — cấu hình env / db / socket
- src/routes — các route (API dưới /api)
- src/controllers — xử lý request
- src/services — logic nghiệp vụ (auth, messages...)
- src/models — Mongoose schemas
- src/public — static (JS/CSS) và view (EJS)
- src/socket — handlers cho Socket.IO
- src/utils — helper

Khắc phục sự cố nhanh
---------------------
- Lỗi liên quan Mongo / session store: kiểm tra MONGO_URI trong `.env`.
- Lỗi đăng nhập/đăng ký: kiểm tra kết nối DB và biến môi trường.
- Muốn bật lại AI: cung cấp GEMINI_API_KEY hoặc cấu hình Service Account và khôi phục aiService.

Góp ý & đóng góp
---------------
Tạo branch mới, thực hiện thay đổi, mở pull request. Luôn giữ secrets ngoài VCS.

License
-------
MIT (tuỳ chỉnh nếu cần)
