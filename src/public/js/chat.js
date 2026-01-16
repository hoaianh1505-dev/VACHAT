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

// Lấy thông tin bạn bè từ danh sách friends (render sẵn trên trang)
function getFriendInfo(friendId) {
    const friendItem = document.querySelector(`.chat-item.friend-profile[data-id="${friendId}"]`);
    if (!friendItem) return {};
    const avatarImg = friendItem.querySelector('.avatar');
    const avatar = avatarImg && avatarImg.tagName === 'IMG'
        ? avatarImg.src
        : undefined;
    const usernameSpan = friendItem.querySelector('.friend-username');
    const username = usernameSpan ? usernameSpan.textContent : '';
    return { avatar, username };
}

// Lưu số đã đọc vào localStorage
function setLastRead(friendId, count) {
    const key = `chat_last_read_${friendId}`;
    localStorage.setItem(key, count);
}
function getLastRead(friendId) {
    const key = `chat_last_read_${friendId}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
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
                if (!msg.isSelf) {
                    // Tin nhắn của bạn bè: hiển thị avatar + username
                    const { avatar, username } = getFriendInfo(currentChat.id);
                    div.innerHTML = `
                        <div style="display:flex;align-items:flex-end;gap:8px;">
                            <img src="${avatar || '/public/avatar.png'}" class="avatar" style="width:28px;height:28px;">
                            <div>
                                <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${username || ''}</div>
                                <div>${msg.content}</div>
                            </div>
                        </div>
                    `;
                } else {
                    // Tin nhắn của mình: chỉ nội dung
                    div.textContent = msg.content;
                }
                chatBox.appendChild(div);
            });
        }
        // Đếm số tin nhắn đã đọc
        setLastRead(item.dataset.id, data.messages ? data.messages.length : 0);
        // Reset badge khi mở chat
        const badge = item.querySelector('.unread-badge');
        if (badge) badge.style.display = 'none';
        if (pendingMessages[item.dataset.id]) delete pendingMessages[item.dataset.id];
        // Scroll xuống cuối khi load lịch sử
        chatBox.scrollTop = chatBox.scrollHeight;
    });
});

// Gửi tin nhắn
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (input.value && currentChat && currentChat.type === 'friend' && currentChat.id) {
        const msg = input.value.trim();
        if (!msg) return;
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
            // Chỉ emit socket sau khi lưu thành công
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
                    if (!msg.isSelf) {
                        // Tin nhắn của bạn bè: hiển thị avatar + username
                        const { avatar, username } = getFriendInfo(currentChat.id);
                        div.innerHTML = `
                            <div style="display:flex;align-items:flex-end;gap:8px;">
                                <img src="${avatar || '/public/avatar.png'}" class="avatar" style="width:28px;height:28px;">
                                <div>
                                    <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${username || ''}</div>
                                    <div>${msg.content}</div>
                                </div>
                            </div>
                        `;
                    } else {
                        // Tin nhắn của mình: chỉ nội dung
                        div.textContent = msg.content;
                    }
                    chatBox.appendChild(div);
                });
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        } else {
            alert(result.error || 'Không gửi được tin nhắn!');
        }
    }
});

// Khi load lại trang, hiển thị badge đúng số tin nhắn chưa đọc
window.addEventListener('DOMContentLoaded', async () => {
    // Lặp qua từng bạn bè
    document.querySelectorAll('.chat-item.friend-profile').forEach(async item => {
        const friendId = item.dataset.id;
        // Gọi API lấy tổng số tin nhắn với bạn này
        const res = await fetch(`/messages?chatType=friend&chatId=${friendId}`);
        const data = await res.json();
        const total = data.messages ? data.messages.length : 0;
        const lastRead = getLastRead(friendId);
        const unread = total - lastRead;
        if (unread > 0) {
            let badge = item.querySelector('.unread-badge');
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
                item.appendChild(badge);
            }
            badge.textContent = unread;
            badge.style.display = 'inline-block';
            pendingMessages[friendId] = unread;
        }
    });
});

// Nhận tin nhắn realtime
socket.on('chat message', (data) => {
    // Ép kiểu về string để so sánh chắc chắn đúng
    const chatId = currentChat ? String(currentChat.id) : '';
    const fromId = String(data.from);
    const chatMsgId = String(data.chat.id);

    if (
        currentChat &&
        (
            (data.isSelf && chatMsgId === chatId) ||
            (!data.isSelf && fromId === chatId)
        )
    ) {
        const div = document.createElement('div');
        div.className = 'message' + (data.isSelf ? ' self' : '');
        if (!data.isSelf) {
            // Tin nhắn của bạn bè: hiển thị avatar + username
            const { avatar, username } = getFriendInfo(data.from);
            div.innerHTML = `
                <div style="display:flex;align-items:flex-end;gap:8px;">
                    <img src="${avatar || '/public/avatar.png'}" class="avatar" style="width:28px;height:28px;">
                    <div>
                        <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${username || ''}</div>
                        <div>${data.message}</div>
                    </div>
                </div>
            `;
        } else {
            div.textContent = data.message;
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        // Cập nhật số đã đọc khi đang mở chat
        setLastRead(chatId, (chatBox.children.length));
    } else {
        // Nếu chưa mở cửa sổ chat với người gửi, tăng badge
        const friendId = data.isSelf ? chatMsgId : fromId;
        const lastRead = getLastRead(friendId);
        pendingMessages[friendId] = (pendingMessages[friendId] || 0) + 1;
        setLastRead(friendId, lastRead); // Không tăng số đã đọc khi chưa mở chat
        // Tìm và cập nhật badge trên danh sách bạn bè
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
} else {
    alert('Không xác định được userId, bạn sẽ không nhận được tin nhắn realtime!');
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

// <-- NEW: nhận thông báo friend accepted (được chấp nhận bởi người nhận)
socket.on('friend-accepted', (data) => {
    // Nếu sự kiện này dành cho user hiện tại (sender)
    if (String(data.toId) !== String(window.userId)) return;
    // Hiển thị popup ngắn rồi reload để cập nhật danh sách bạn bè
    const popup = document.createElement('div');
    popup.className = 'friend-request-popup';
    popup.innerHTML = `
        <div class="friend-request-modal">
            <div class="friend-request-title">Lời mời của bạn đã được chấp nhận!</div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <img src="${data.fromUser.avatar || '/public/avatar.png'}" class="avatar" style="width:38px;height:38px;">
                <div style="font-weight:700;color:#4f8cff;">${data.fromUser.username}</div>
            </div>
            <div class="friend-request-actions">
                <button class="btn" id="close-accepted-btn">Đóng</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#close-accepted-btn').onclick = () => {
        popup.remove();
        location.reload(); // đơn giản reload để đồng bộ UI
    };
    // tự đóng sau 2s và reload
    setTimeout(() => {
        if (popup.parentNode) popup.remove();
        location.reload();
    }, 2000);
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
