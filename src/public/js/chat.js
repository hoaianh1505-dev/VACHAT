const socket = io();
const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const chatBox = document.getElementById('chat-box');
let currentChat = null; // {type, id}

// Hiển thị loading
function showLoading() {
    chatBox.innerHTML = `
        <div class="chat-loading">
            <div class="chat-spinner"></div>
        </div>
    `;
}

// Hiển thị thông báo hệ thống
function showSystemMessage(msg) {
    const div = document.createElement('div');
    div.className = 'system-message';
    div.textContent = msg;
    chatBox.appendChild(div);
}

// Chọn cuộc trò chuyện
document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
        currentChat = {
            type: item.dataset.type,
            id: item.dataset.id
        };
        showLoading();
        // Ẩn placeholder khi chọn chat
        const placeholder = document.getElementById('chat-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        // TODO: Gọi API lấy lịch sử chat cho cuộc trò chuyện này
        setTimeout(() => {
            chatBox.innerHTML = '';
            showSystemMessage('Bạn đã bắt đầu cuộc trò chuyện.');
        }, 600); // giả lập loading
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
    div.className = 'message' + (data.isSelf ? ' self' : '');
    div.textContent = data.message;
    chatBox.appendChild(div);
});

const emojiList = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '🥳', '😎', '😢'];
const emojiBtn = document.createElement('button');
emojiBtn.type = 'button';
emojiBtn.id = 'emoji-btn';
emojiBtn.className = 'icon-btn';
emojiBtn.title = 'Chèn emoji';
emojiBtn.textContent = '😊';
form.insertBefore(emojiBtn, input);

const emojiPicker = document.createElement('div');
emojiPicker.id = 'emoji-picker';
emojiPicker.style.display = 'none';
emojiPicker.style.position = 'absolute';
emojiPicker.style.bottom = '50px';
emojiPicker.style.left = '10px';
emojiPicker.style.background = '#23232a';
emojiPicker.style.border = '1px solid #23232a';
emojiPicker.style.borderRadius = '8px';
emojiPicker.style.padding = '8px';
emojiPicker.style.zIndex = '10';
emojiPicker.style.boxShadow = '0 2px 8px #4f8cff44';
emojiPicker.style.fontSize = '1.3rem';

emojiList.forEach(e => {
    const span = document.createElement('span');
    span.textContent = e;
    span.style.cursor = 'pointer';
    span.style.margin = '4px';
    span.onclick = () => {
        input.value += e;
        emojiPicker.style.display = 'none';
        input.focus();
    };
    emojiPicker.appendChild(span);
});
form.appendChild(emojiPicker);

emojiBtn.onclick = (e) => {
    e.preventDefault();
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
};

const searchBtn = document.getElementById('search-btn');
const searchInput = document.getElementById('search-user');

searchBtn.onclick = async (e) => {
    e.preventDefault();
    const username = searchInput.value.trim();
    if (!username) return;
    const res = await fetch(`/search-user?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    const sidebar = document.querySelector('.chat-sidebar');
    let html = '';
    if (data.error) {
        html = `<div class="system-message">${data.error}</div>`;
    } else {
        let btnHtml = '';
        if (data.pending) {
            btnHtml = `<button id="cancel-friend-btn" class="btn" data-id="${data._id}" style="background:#ef4444;">Thu hồi lời mời</button>`;
        } else {
            btnHtml = `<button id="add-friend-btn" class="btn" data-id="${data._id}">Gửi kết bạn</button>`;
        }
        html = `
        <div class="profile-search" id="profile-search-result">
            <img src="${data.avatar}" class="avatar" style="width:48px;height:48px;">
            <div class="profile-info">
                <div class="profile-username">${data.username}</div>
                ${btnHtml}
            </div>
        </div>
        `;
    }
    // Xóa kết quả cũ trước khi thêm mới
    const oldProfile = document.getElementById('profile-search-result');
    if (oldProfile) oldProfile.remove();
    sidebar.querySelector('.friend-list').insertAdjacentHTML('afterbegin', html);

    // Gửi kết bạn
    const addBtn = document.getElementById('add-friend-btn');
    if (addBtn) {
        addBtn.onclick = async () => {
            const toId = addBtn.dataset.id;
            const res = await fetch('/add-friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toId })
            });
            const result = await res.json();
            addBtn.disabled = true;
            addBtn.textContent = result.error ? result.error : 'Đã gửi!';
            setTimeout(() => {
                const profileDiv = document.getElementById('profile-search-result');
                if (profileDiv) profileDiv.remove();
                searchInput.value = '';
            }, 900);
        };
    }
    // Thu hồi lời mời
    const cancelBtn = document.getElementById('cancel-friend-btn');
    if (cancelBtn) {
        cancelBtn.onclick = async () => {
            const toId = cancelBtn.dataset.id;
            const res = await fetch('/cancel-friend-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toId })
            });
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Đã thu hồi!';
            setTimeout(() => {
                const profileDiv = document.getElementById('profile-search-result');
                if (profileDiv) profileDiv.remove();
                searchInput.value = '';
            }, 900);
        };
    }
};
