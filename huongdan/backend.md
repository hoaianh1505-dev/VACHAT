# Hướng Dẫn Backend (VAChat)

## Tổng Quan
Backend dùng Express.js + Socket.IO + MongoDB (Mongoose). Session lưu trong MongoDB.

## Cấu Trúc Liên Quan

- `src/server.js`: entry point
- `src/config/`: cấu hình môi trường, database, session, socket
- `src/routes/`: định nghĩa route
- `src/controllers/`: xử lý request
- `src/services/`: business logic
- `src/models/`: schema MongoDB
- `src/socket/`: handler Socket.IO

### Chi Tiết Cấu Trúc & Vai Trò File

```
src/
	server.js               # Khởi tạo app, HTTP server, Socket.IO
	config/
		appMiddleware.js      # Đăng ký middleware toàn cục
		appRoutes.js          # Mount routes
		database.js           # Kết nối MongoDB
		environment.js        # Load .env và cấu hình
		sessionStore.js       # Cấu hình session MongoDB
		socket.js             # Khởi tạo Socket.IO
	controllers/
		authController.js     # Đăng nhập/đăng ký
		friendController.js   # Quản lý bạn bè
		groupController.js    # Quản lý nhóm
		homeController.js     # Render trang chính
		messageController.js  # API tin nhắn
		userController.js     # Thông tin user
	middleware/
		auth.js               # Bảo vệ route
		cors.js               # CORS
		errorHandler.js       # Xử lý lỗi chung
		index.js              # Export middleware
		validation.js         # Kiểm tra input
	models/
		User.js               # Schema user
		Message.js            # Schema tin nhắn
		Group.js              # Schema nhóm
		GroupMessage.js       # Schema tin nhắn nhóm
		FriendRequest.js      # Schema lời mời kết bạn
	routes/
		api.js                # API health/info
		auth.js               # Auth routes
		friends.js            # Friend routes
		groups.js             # Group routes
		home.js               # Render chat
		messages.js           # Message routes
		users.js              # User routes
	services/
		authService.js        # Logic đăng nhập/đăng ký
		friendService.js      # Logic bạn bè
		groupService.js       # Logic nhóm
		messageService.js     # Logic tin nhắn
		messageGuard.js       # Kiểm tra quyền nhắn
		userService.js        # Logic user
	socket/
		friendSocket.js       # Socket sự kiện bạn bè
		groupSocket.js        # Socket sự kiện nhóm
		messageSocket.js      # Socket sự kiện tin nhắn
		socketHandlers.js     # Tổng hợp handlers
		userSocket.js         # Socket sự kiện user
	utils/
		asyncHandler.js       # Wrapper async
		logger.js             # Logging
		rateLimiter.js        # Giới hạn request
		response.js           # Chuẩn hóa response
		sanitizer.js          # Lọc dữ liệu đầu vào
		validation.js         # Tiện ích validate
```

### Phần Còn Thiếu (CHƯA LÀM)

- [CHƯA LÀM] Thêm rate-limit theo user/IP ở các API nhạy cảm (login, register, send-message)
- [CHƯA LÀM] Thêm cơ chế refresh token hoặc rotate session để tăng bảo mật
- [CHƯA LÀM] Bổ sung kiểm tra quyền khi thao tác nhóm (xóa nhóm, thêm/xóa thành viên)
- [CHƯA LÀM] Thêm chỉ mục MongoDB cho truy vấn tin nhắn và bạn bè để tối ưu
- [CHƯA LÀM] Thêm job dọn dữ liệu/expire message cũ (nếu cần)
- [CHƯA LÀM] Thêm unit/integration tests cho service chính
- [CHƯA LÀM] Thêm seed script tạo data mẫu cho dev

## Cấu Hình Môi Trường

Tạo `.env`:

```env
MONGO_URI=mongodb://localhost:27017/vachat
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret
CHAT_SECRET=your_chat_secret
```

## Chạy Ứng Dụng

- Dev: `npm run dev`
- Production: `npm start`

## Luồng Chính

1. `server.js` khởi tạo Express + HTTP server + Socket.IO
2. Kết nối DB qua `config/database.js`
3. Cấu hình middleware và session
4. Mount routes

## API Chính

- `POST /login`, `POST /register`
- `POST /api/messages/send-message`
- `GET /api/messages/history`

## Socket Events (Server)

- `register-user`
- `chat message`
- `join-group`
- `conversation-deleted`

## Lưu Ý

- Nếu không connect DB, app sẽ không hoạt động.
- Đổi `SESSION_SECRET` và `CHAT_SECRET` khi deploy.
