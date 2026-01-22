# Hướng Dẫn Frontend (VAChat)

## Tổng Quan
Frontend sử dụng EJS để render view và JavaScript ES6 Modules cho logic phía client.

## Cấu Trúc Liên Quan

- `src/view/`: các template EJS
- `src/public/css/`: stylesheet
- `src/public/js/`: các module client

### Chi Tiết Cấu Trúc & Vai Trò File

```
src/
   view/
      index.ejs       # Trang chào/landing
      login.ejs       # Form đăng nhập
      register.ejs    # Form đăng ký
      home.ejs        # Trang home sau đăng nhập
      chat.ejs        # UI chat chính
      error.ejs       # Trang lỗi chung
   public/
      css/
         style.css     # Style chính
      js/
         app.mjs       # Bootstrap client, gắn UI
         chat.mjs      # Logic chat, render message
         friends.mjs   # Logic bạn bè
         socket.mjs    # Kết nối và lắng nghe Socket.IO
         ui.mjs        # Helper UI, thông báo, modal
```

### Phần Còn Thiếu (CHƯA LÀM)

- [CHƯA LÀM] Tách UI components (header/sidebar/chatbox) thành partial EJS
- [CHƯA LÀM] Thêm skeleton/loading state cho chat list và message list
- [CHƯA LÀM] Tối ưu render message (virtual list) khi lịch sử dài
- [CHƯA LÀM] Thêm debounce cho search bạn bè/nhóm
- [CHƯA LÀM] Hoàn thiện xử lý lỗi UI (toast/alert thống nhất)
- [CHƯA LÀM] Chuẩn hóa module exports/imports và dọn biến global

## Chạy Ứng Dụng

1. Cài dependencies:
   - `npm install`
2. Chạy dev:
   - `npm run dev`
3. Truy cập:
   - `http://localhost:3000`

## Các File Quan Trọng

- `src/view/index.ejs`: landing page
- `src/view/login.ejs`: đăng nhập
- `src/view/register.ejs`: đăng ký
- `src/view/chat.ejs`: giao diện chat
- `src/public/js/app.mjs`: khởi tạo app
- `src/public/js/chat.mjs`: xử lý chat
- `src/public/js/socket.mjs`: kết nối Socket.IO
- `src/public/js/ui.mjs`: UI helpers

## Socket Events (Client)

- `connect`: kết nối thành công
- `register-user`: đăng ký userId
- `chat message`: nhận tin nhắn
- `conversation-deleted`: cập nhật khi xóa cuộc trò chuyện

## Lưu Trạng Thái

- LocalStorage key: `vachat.lastChat`
- Global: `window.VAChat`

## Lưu Ý

- Đảm bảo server chạy để EJS render view.
- Khi chỉnh sửa JS/CSS, chỉ cần refresh trang.
