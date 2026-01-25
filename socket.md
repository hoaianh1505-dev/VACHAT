# Socket Flow (VAChat)

## Tổng Quan
VAChat sử dụng Socket.IO để gửi/nhận tin nhắn real-time. Client kết nối socket sau khi load trang chat và đăng ký userId để map socketId.

## Flow Thực Tế (Theo Code)

```
Client load (app.mjs)
  -> init socket (socket.mjs)
  -> socket connect
      -> emit register-user(userId)
  -> initMessages (chat.mjs)

Gửi tin nhắn
  -> user submit form
  -> socket.emit('message:send', payload, ack)
  -> server lưu DB
  -> server emit 'chat message' (sender + receiver)
  -> client nhận 'chat message' và render
  -> ack trả về success/error

Đã đọc (friend)
  -> client mở chat: emit friend-mark-read(messageIds)
  -> server update readBy
  -> server emit friend-read-receipt cho người gửi
  -> client hiển thị avatar đã xem dưới tin nhắn cuối
```

## Kết Nối
- Client: `/socket.io/socket.io.js`
- Khi load: `io({ auth: { userId } })`
- Sự kiện đăng ký: `register-user` (client -> server)
- Tự động reconnect: bật trong `socket.mjs` (reconnection + reconnectionAttempts)

## Gửi Tin Nhắn (message:send)
**Client -> Server**

```
message:send
payload: { chatType: 'friend' | 'group', chatId, message }
ack: { success: boolean, id?, createdAt?, error? }
```

**Server**
- `src/socket/messageSocket.js`: nhận `message:send`
- `services/messageService.createMessage`: lưu DB + emit `chat message`

## Nhận Tin Nhắn (chat message)
**Server -> Client**

```
chat message
payload: {
  messageId,
  chat: { type, id, conversationId },
  message,
  from,
  to,
  createdAt,
  isSelf
}
```

Client xử lý trong `src/public/js/chat.mjs` để render UI.

## Đã Đọc (Read Receipt)
**Client -> Server**

```
friend-mark-read
(chatId, messageIds[])
```

**Server -> Client**

```
friend-read-receipt
{ chatId, readerId, messageIds }
```

## Nhóm (Group)
- `join-group`: tham gia room `group_<groupId>`
- `group-typing`: typing indicator (tuỳ chọn)
- `group-mark-read`: đánh dấu đã đọc trong nhóm

## Ghi Chú
- Tin nhắn được lưu DB trước khi emit.
- Mọi UI real-time dựa trên sự kiện `chat message`.

## TCP/IP Trong Dự Án Này
- Ứng dụng **không dùng TCP thuần từ trình duyệt**. Browser chỉ giao tiếp qua **HTTP/WebSocket**.
- Socket.IO chạy **trên TCP/IP** (WebSocket cũng là TCP), nên dự án **vẫn sử dụng TCP ở tầng vận chuyển**, nhưng được trừu tượng hóa.
- Luồng thực tế:
  - Browser ↔ Server: HTTP/WebSocket (TCP/IP)
  - Server ↔ MongoDB: TCP/IP
- Cổng thường dùng:
  - App: `PORT` (mặc định 3000)
  - MongoDB: `27017` (local)
- Bắt tay kết nối (rút gọn):
  - HTTP Upgrade → WebSocket (TCP)
  - Sau đó Socket.IO trao đổi event dạng JSON
- Đảm bảo tin nhắn:
  - Server chỉ emit sau khi **lưu DB thành công**
  - Client nhận bằng event `chat message`
- Nếu muốn **TCP thuần**, cần viết **TCP client** riêng hoặc **gateway** (WebSocket/HTTP ↔ TCP).

### Thành phần Socket trong Project
- Client Socket: `src/public/js/socket.mjs`
  - Tạo kết nối `io(...)` (WebSocket trên TCP)
  - Gửi auth `userId` qua `socket.auth`
  - Reconnect tự động
- Client Chat: `src/public/js/chat.mjs`
  - Gửi tin: `message:send`
  - Nhận tin: `chat message`
  - Đã đọc: `friend-mark-read` / `friend-read-receipt`
- Server Socket: `src/socket/messageSocket.js`
  - Nhận `message:send`
  - Lưu DB và emit realtime
- Server Group Socket: `src/socket/groupSocket.js`
  - Join room `group_<id>`
  - Read receipt cho nhóm

### Mapping Event ↔ TCP/IP
- Mỗi event Socket.IO là một **frame WebSocket** (TCP segment bên dưới)
- Payload là JSON, tự serialize/deserialize bởi Socket.IO
- Khi mất kết nối TCP, Socket.IO tự reconnect và emit lại `register-user`

### Điểm Liên Quan Tầng Ứng Dụng
- HTTP vẫn dùng để render page / lấy lịch sử (GET `/api/messages`)
- Socket.IO dùng cho realtime gửi/nhận/đã đọc
- Cả hai đều chạy trên TCP/IP nhưng khác tầng (HTTP vs WebSocket)
