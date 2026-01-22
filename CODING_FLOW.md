# Phân Tích Chi Tiết Codebase VAChat

Tài liệu này giải thích tường tận luồng đi của dữ liệu từ lúc bạn chạy `npm run dev` cho đến khi tin nhắn được gửi đi.

## 1. Khởi Động Ứng Dụng (Startup)

Tất cả bắt đầu từ `src/server.js`.

1.  **Khởi tạo App**:
    - `express()` tạo web server.
    - `http.createServer(app)` tạo server HTTP để dùng chung cho cả Express và Socket.IO.
    - `socketio(server)` gắn Socket.IO vào server HTTP này.

2.  **Kết nối Database**:
    - Gọi `db.connect()` từ `config/database.js`. Nếu thất bại, server sẽ tắt ngay lập tức.

3.  **Cài đặt Middleware (`setupMiddleware`)**:
    - Chạy từ `config/appMiddleware.js`.
    - Quan trọng nhất là **Session**: `express-session` được cấu hình với `MongoStore`. Điều này nghĩa là thông tin đăng nhập của user được lưu trong MongoDB chứ không phải bộ nhớ RAM (giúp server restart không bị mất login).
    - Session này được chia sẻ với Socket.IO để socket biết user nào đang kết nối.

4.  **Cài đặt Routes (`setupRoutes`)**:
    - Chạy từ `config/appRoutes.js`.
    - Mount toàn bộ các route (API, Auth, Home) vào ứng dụng.

## 2. Luồng Đăng Nhập & Đăng Ký (Authentication)

Khi user vào `/login` hoặc `/register`:

- **Route**: `src/routes/auth.js`
- **Controller**: `src/controllers/authController.js`
- **View**: Render file `.ejs` tương ứng trong `src/view/`.

**Quy trình Xử lý Đăng nhập:**
1.  User post form lên `/login`.
2.  Route gọi `validation.login` để kiểm tra input (email đúng định dạng, pass đủ dài...).
3.  Nếu OK, gọi `authController.login`.
4.  Controller gọi `authService.login`:
    - Tìm user trong DB bằng email.
    - Dùng `bcrypt.compare` để so sánh password nhập vào với password đã mã hóa trong DB.
    - Nếu đúng, trả về object user.
5.  Controller lưu user vào `req.session.user`. Đây là hành động "đánh dấu đã đăng nhập".
6.  Redirect về `/chat`.

## 3. Vào Giao Diện Chat (Main App)

Khi user đã login và vào `/chat`:

- **Route**: `src/routes/home.js` -> `/chat` (có middleware `auth` chặn nếu chưa login).
- **Controller**: `homeController.chat`:
    - Lấy `userId` từ session.
    - Gọi `userService.getById(userId)` để lấy thông tin chi tiết (bạn bè, nhóm).
    - Render `src/view/chat.ejs` và truyền dữ liệu user, friends, groups vào.

**Ở phía Client (`src/public/js/app.mjs`)**:
1.  Trình duyệt tải xong HTML.
2.  Script kết nối Socket.IO chạy: `io({ auth: { userId: ... } })`.
3.  Client gửi sự kiện `register-user` lên server để báo danh "Tôi là User A, hãy map socket ID của tôi với User A".

## 4. Luồng Gửi Tin Nhắn (Core Logic)

Đây là phần phức tạp nhất, kết hợp giữa HTTP REST API và WebSocket real-time.

**Bước 1: User bấm Gửi**
- File `app.mjs` bắt sự kiện submit form.
- Gọi `fetch('/api/messages/send-message')` (POST).
- **Lý do dùng API thay vì Socket**: Để đảm bảo tin nhắn được lưu vào DB thành công trước (reliable), và tận dụng cơ chế request/response của HTTP để báo lỗi/thành công cho người gửi.

**Bước 2: Server Xử lý (API Layer)**
- `routes/messages.js` nhận request.
- `messageController.sendMessage` kiểm tra input và gọi service.

**Bước 3: Service Xử lý (Logic Layer)**
- `services/messageService.js` hàm `createMessage`:
    1.  **Mã hóa**: Tin nhắn được mã hóa AES (hàm `encryptMessage`) trước khi lưu.
    2.  **Lưu DB**: Tạo bản ghi `Message` mới trong MongoDB.
    3.  **Real-time Emit**: Service nhận vào biến `io`.
        - Nếu chat 1-1: Emit sự kiện `chat message` đến socket của người gửi VÀ người nhận.
        - Nếu chat nhóm: Emit vào room của nhóm (`group_ID`).

**Bước 4: Client nhận tin (UI Layer)**
- `app.mjs` lắng nghe sự kiện `socket.on('chat message')`.
- Khi nhận được, nó kiểm tra xem tin nhắn có thuộc cuộc trò chuyện đang mở không.
    - Nếu CÓ: `appendMessage` để hiện tin nhắn lên màn hình.
    - Nếu KHÔNG: Hiện badge thông báo tin nhắn chưa đọc bên sidebar.

## 5. Bản Đồ Code (Cần Sửa Gì Thì Vào Đâu?)

| Bạn Muốn Sửa... | File Cần Tìm |
| :--- | :--- |
| **Giao diện HTML/CSS** | `src/view/*.ejs` và `src/public/css/style.css` |
| **Logic Frontend (JS)** | `src/public/js/app.mjs` |
| **Thêm Route mới** | `src/routes/*.js` |
| **Sửa logic data/DB** | `src/services/*.js` |
| **Sửa Schema Database** | `src/models/*.js` |
| **Cấu hình Server** | `src/server.js` |
