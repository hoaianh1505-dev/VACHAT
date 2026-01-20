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

3. Chạy server (dev):
   npm run dev

4. Mở trình duyệt tới http://localhost:1505

Biến môi trường chính
- MONGO_URI — chuỗi kết nối MongoDB (bắt buộc cho DB/session trong prod).
- PORT — cổng server.
- SESSION_SECRET — secret cho express-session.
- CHAT_SECRET — (tùy) AES key để mã hoá tin nhắn.

Lưu ý realtime & debug
- Realtime hoạt động khi mọi client kết nối tới cùng 1 Socket.IO server.
- Nếu bạn chạy 2 server local (mỗi máy 1 server), 2 client sẽ không thấy tin nhắn của nhau — cần 1 server chung hoặc dùng adapter (Redis) để đồng bộ nhiều instance.
- Kiểm tra DevTools → Network (WS) để xác nhận socket kết nối tới đúng backend.
- Server có helper `io.emitToUser` để gửi tới tất cả sockets của 1 user; client phải gửi userId (window.userId) hoặc gọi register(userId) sau khi connect.

Bảo mật
- KHÔNG commit `.env` chứa secrets.
- Dùng HTTPS và `SESSION_SECRET` mạnh cho production.

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

---

Lightweight chat app.

Quick start:
1. Copy .env and set MONGO_URI, PORT, SESSION_SECRET...
2. npm install
3. npm run dev   # or npm start

Server entry: `src/server.js`
Socket handlers: `src/socket/socketHandlers.js`

No UI/UX changes performed — only code cleanups and socket/router wiring.
