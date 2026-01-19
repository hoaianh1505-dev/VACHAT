# AVChat

Ứng dụng chat nhẹ (Express + Socket.IO + MongoDB). Hỗ trợ nhắn tin realtime 1:1 và nhóm, danh sách bạn bè, lưu lịch sử tin nhắn (mã hoá AES). Tính năng AI trong mã có thể bị vô hiệu hoá trên nhánh này.

Nội dung nhanh
- Server: Node.js (Express) + Socket.IO, REST API under /api, views EJS ở /src/view.
- Client: Static JS trong /src/public (messages.mjs, friends.mjs, socket-client.mjs).
- DB: MongoDB (Atlas hoặc self‑hosted).

Yêu cầu
- Node.js >= 18
- npm
- MongoDB URI (Atlas hoặc local)

Cài đặt & chạy
1. Cài phụ thuộc:
   npm install

2. Tạo file `.env` (không commit) với tối thiểu:
   MONGO_URI=your_mongo_uri
   PORT=1505
   SESSION_SECRET=your_session_secret
   (tùy chọn) FRONTEND_URL=https://your-frontend.example

3. Chạy server (dev):
   npm run dev

4. Mở trình duyệt tới http://localhost:1505 (hoặc URL công khai qua ngrok)

Chạy client tách rời
- Nếu bạn muốn host giao diện trên máy khác, set `FRONTEND_URL` trên server và trên client đặt:
  <script>window.BACKEND_URL='https://your-server.example'</script>
- Đảm bảo cả 2 client kết nối cùng 1 backend (ngrok/public IP) để realtime hoạt động.

Biến môi trường chính
- MONGO_URI — chuỗi kết nối MongoDB (bắt buộc cho DB/session trong prod).
- PORT — cổng server.
- SESSION_SECRET — secret cho express-session.
- CHAT_SECRET — (tùy) AES key để mã hoá tin nhắn.
- FRONTEND_URL — origin client (dùng khi client tách rời).
- GEMINI_API_KEY / SERVICE_ACCOUNT_JSON — AI (có thể bị tắt).

Lưu ý realtime & debug
- Realtime hoạt động khi mọi client kết nối tới cùng 1 Socket.IO server.
- Nếu bạn chạy 2 server local (mỗi máy 1 server), 2 client sẽ không thấy tin nhắn của nhau — cần 1 server chung hoặc dùng adapter (Redis) để đồng bộ nhiều instance.
- Kiểm tra DevTools → Network (WS) để xác nhận socket kết nối tới đúng backend.
- Server có helper `io.emitToUser` để gửi tới tất cả sockets của 1 user; client phải gửi userId (window.userId) hoặc gọi register(userId) sau khi connect.

AI
- AI có thể bị tắt trên nhánh này. Nếu muốn bật, cung cấp GEMINI_API_KEY hoặc cấu hình Service Account và khôi phục aiService.

Bảo mật
- KHÔNG commit `.env` chứa secrets.
- Dùng HTTPS và `SESSION_SECRET` mạnh cho production.
- Nếu dùng cookie cross‑origin: host client qua HTTPS và set FRONTEND_URL; cookie.sameSite có thể là 'none' và secure=true.

Khắc phục nhanh
- Lỗi session store / connect-mongo: kiểm tra MONGO_URI, server log báo nếu fallback sang MemoryStore.
- Tin nhắn không realtime: kiểm tra client BACKEND_URL/socket URL, server logs (socket register), và đảm bảo cùng 1 backend.

Cấu trúc chính
- src/server.js — entrypoint
- src/config — môi trường / db / socket
- src/routes, src/controllers, src/services, src/models
- src/public — client JS/CSS
- src/socket — handlers Socket.IO
- src/utils — helper

Góp ý & đóng góp
- Tạo branch, commit, PR. Giữ secrets ngoài repo.

License
- MIT
