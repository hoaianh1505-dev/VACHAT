const socket = io();
const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const chatBox = document.getElementById('chat-box');
let currentChat = null; // {type, id}
let pendingMessages = {}; // {friendId: count}

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
document.querySelectorAll('.chat-item.friend-profile').forEach(item => {
    item.addEventListener('click', async () => {
        // Đảm bảo mapping đúng id bạn bè
        currentChat = {
            type: 'friend',
            id: item.dataset.id // _id của bạn bè
        };
        showLoading();
        // Ẩn placeholder khi chọn chat
        const placeholder = document.getElementById('chat-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        // Gọi API lấy lịch sử chat cho cuộc trò chuyện này
        const res = await fetch(`/messages?chatType=${currentChat.type}&chatId=${currentChat.id}`);
        const data = await res.json();
        chatBox.innerHTML = '';
        if (!data.messages || !data.messages.length) {
            showSystemMessage('Bạn đã bắt đầu cuộc trò chuyện.');
        } else {
            data.messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message' + (msg.isSelf ? ' self' : '');
                div.textContent = msg.content;
                chatBox.appendChild(div);
            });
        }
        // Reset badge khi mở chat
        const badge = item.querySelector('.unread-badge');
        if (badge) badge.style.display = 'none';
        if (pendingMessages[item.dataset.id]) delete pendingMessages[item.dataset.id];
    });
});

// Gửi tin nhắn
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Chỉ gửi khi đã chọn đúng bạn bè
    if (input.value && currentChat && currentChat.type === 'friend' && currentChat.id) {
        // Gửi lên server lưu DB
        const res = await fetch('/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatType: currentChat.type,
                chatId: currentChat.id,
                message: input.value
            })
        });
        const result = await res.json();
        if (result.success) {
            // Emit realtime, gửi đủ thông tin
            socket.emit('chat message', {
                chat: currentChat,
                message: input.value,
                from: window.userId,
                to: currentChat.id,
                createdAt: result.message.createdAt
            });
            input.value = '';
            // Reload lại lịch sử chat để đảm bảo đồng bộ với DB
            const reload = await fetch(`/messages?chatType=${currentChat.type}&chatId=${currentChat.id}`);
            const data = await reload.json();
            chatBox.innerHTML = '';
            if (!data.messages || !data.messages.length) {
                showSystemMessage('Bạn đã bắt đầu cuộc trò chuyện.');
            } else {
                data.messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = 'message' + (msg.isSelf ? ' self' : '');
                    div.textContent = msg.content;
                    chatBox.appendChild(div);
                });
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            alert(result.error || 'Không gửi được tin nhắn!');
        }
    }
});

// Nhận tin nhắn realtime
socket.on('chat message', (data) => {
    console.log('Nhận socket chat message:', data);
    // Nếu đang chat với đúng người thì hiển thị
    // Sửa: so sánh currentChat.id với data.from nếu là người nhận
    if (
        currentChat &&
        (
            (data.isSelf && data.chat.id === currentChat.id) || // mình gửi
            (!data.isSelf && data.from === currentChat.id)      // mình nhận
        )
    ) {
        const div = document.createElement('div');
        div.className = 'message' + (data.isSelf ? ' self' : '');
        div.textContent = data.message;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        // Nếu chưa mở cửa sổ chat với người gửi, tăng badge
        // Sửa: badge ở bạn bè có id = data.isSelf ? data.chat.id : data.from
        const friendId = data.isSelf ? data.chat.id : data.from;
        pendingMessages[friendId] = (pendingMessages[friendId] || 0) + 1;
        const friendItem = document.querySelector(`.chat-item.friend-profile[data-id="${friendId}"]`);
        if (friendItem) {
            let badge = friendItem.querySelector('.unread-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge';
                badge.style.background = '#ef4444';
                badge.style.color = '#fff';
                badge.style.fontSize = '0.8rem';
                badge.style.borderRadius = '50%';
                badge.style.padding = '2px 7px';
                badge.style.marginLeft = '8px';
                badge.style.fontWeight = 'bold';
                friendItem.appendChild(badge);
            }
            badge.textContent = pendingMessages[friendId];
            badge.style.display = 'inline-block';
        }
    }
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
    const sidebar = document.querySelector('.chat-sidebar');
    if (!sidebar || !sidebar.querySelector('.friend-list')) {
        alert('Không tìm thấy khu vực sidebar hoặc friend-list!');
        return;
    }
    if (!username) {
        const oldProfile = document.getElementById('profile-search-result');
        if (oldProfile) oldProfile.remove();
        sidebar.querySelector('.friend-list').insertAdjacentHTML('afterbegin',
            `<div class="system-message">Vui lòng nhập username.</div>`);
        return;
    }
    try {
        const res = await fetch(`/search-user?username=${encodeURIComponent(username)}`);
        const data = await res.json();
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
    } catch (err) {
        const oldProfile = document.getElementById('profile-search-result');
        if (oldProfile) oldProfile.remove();
        sidebar.querySelector('.friend-list').insertAdjacentHTML('afterbegin',
            `<div class="system-message">Lỗi kết nối server!</div>`);
    }
}

// Đăng ký userId với socket server khi vào trang chat
if (window.userId) {
    socket.emit('register-user', window.userId);
}

// Tạo badge số lượng lời mời kết bạn trên nút chuông
function updateFriendRequestBadge(count) {
    const bellBtn = document.querySelector('.icon-btn[title="Thông báo"]');
    if (!bellBtn) return;
    let badge = bellBtn.querySelector('.friend-request-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'friend-request-badge';
        bellBtn.appendChild(badge);
    }
    badge.textContent = count > 0 ? count : '';
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

// Lấy số lượng lời mời kết bạn đang chờ khi vào trang chat
async function fetchFriendRequestCount() {
    const res = await fetch('/pending-friend-requests');
    const data = await res.json();
    updateFriendRequestBadge(data.requests ? data.requests.length : 0);
}
fetchFriendRequestCount();

// Khi nhận realtime lời mời kết bạn thì cập nhật lại badge
socket.on('friend-request', (data) => {
    // Nếu đang là người nhận (toId trùng với userId)
    if (data.toId !== window.userId) return;
    // Tạo popup thông báo
    const popup = document.createElement('div');
    popup.className = 'friend-request-popup';
    popup.innerHTML = `
        <div class="friend-request-modal">
            <div class="friend-request-title">Bạn có lời mời kết bạn mới!</div>
            <div class="friend-request-user">
                <img src="${data.fromUser.avatar}" class="avatar" style="width:38px;height:38px;">
                <span>${data.fromUser.username}</span>
            </div>
            <div class="friend-request-actions">
                <button class="btn" id="accept-friend-btn">Chấp nhận</button>
                <button class="btn" id="reject-friend-btn" style="background:#ef4444;">Từ chối</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Đóng popup khi chọn
    popup.querySelector('#accept-friend-btn').onclick = () => {
        // TODO: Gọi API accept friend (chưa có)
        popup.remove();
        location.reload();
    };
    popup.querySelector('#reject-friend-btn').onclick = () => {
        // TODO: Gọi API reject friend (chưa có)
        popup.remove();
    };
    fetchFriendRequestCount();
});

// Thêm sự kiện cho nút chuông để xem các lời mời kết bạn đang chờ
document.querySelector('.icon-btn[title="Thông báo"]').onclick = async () => {
    // Gọi API lấy danh sách lời mời kết bạn đang chờ
    const res = await fetch('/pending-friend-requests');
    const data = await res.json();
    // Xóa popup cũ nếu có
    document.querySelectorAll('.friend-request-popup').forEach(e => e.remove());
    if (!data.requests || !data.requests.length) {
        // Không có lời mời
        const popup = document.createElement('div');
        popup.className = 'friend-request-popup';
        popup.innerHTML = `
            <div class="friend-request-modal">
                <div class="friend-request-title">Không có lời mời kết bạn nào!</div>
                <div class="friend-request-actions">
                    <button class="btn" id="close-request-btn">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        popup.querySelector('#close-request-btn').onclick = () => popup.remove();
        return;
    }
    // Hiển thị từng lời mời
    data.requests.forEach(req => {
        const popup = document.createElement('div');
        popup.className = 'friend-request-popup';
        popup.innerHTML = `
            <div class="friend-request-modal">
                <div class="friend-request-title">Lời mời kết bạn từ:</div>
                <div class="friend-request-user">
                    <img src="${req.from.avatar}" class="avatar" style="width:38px;height:38px;">
                    <span>${req.from.username}</span>
                </div>
                <div class="friend-request-actions">
                    <button class="btn" id="accept-friend-btn-${req._id}">Chấp nhận</button>
                    <button class="btn" id="reject-friend-btn-${req._id}" style="background:#ef4444;">Từ chối</button>
                    <button class="btn" id="close-request-btn-${req._id}" style="background:#23232a;">Đóng</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        // Đóng popup
        popup.querySelector(`#close-request-btn-${req._id}`).onclick = () => popup.remove();

        // Chấp nhận lời mời
        popup.querySelector(`#accept-friend-btn-${req._id}`).onclick = async () => {
            await fetch('/accept-friend-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: req._id })
            });
            popup.remove();
            location.reload();
            fetchFriendRequestCount();
        };

        // Từ chối lời mời
        popup.querySelector(`#reject-friend-btn-${req._id}`).onclick = async () => {
            await fetch('/reject-friend-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: req._id })
            });
            popup.remove();
            fetchFriendRequestCount();
        };
    });
};
