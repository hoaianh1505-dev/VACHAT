const socket = io();
const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const chatBox = document.getElementById('chat-box');
let currentChat = null; // {type, id}

// Chọn cuộc trò chuyện
document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
        currentChat = {
            type: item.dataset.type,
            id: item.dataset.id
        };
        chatBox.innerHTML = ''; // Xóa tin nhắn cũ
        // TODO: Gọi API lấy lịch sử chat cho cuộc trò chuyện này
        // socket.emit('load messages', currentChat);
    });
});

// Gửi tin nhắn
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value && currentChat) {
        socket.emit('chat message', {
            chat: currentChat,
            message: input.value
        });
        input.value = '';
    }
});

// Nhận tin nhắn
socket.on('chat message', (data) => {
    if (!currentChat || data.chat.id !== currentChat.id) return;
    const div = document.createElement('div');
    div.textContent = data.message;
    chatBox.appendChild(div);
});
