// ...home page JS...
document.addEventListener('DOMContentLoaded', function () {
    const friendList = document.getElementById('friendList');
    const groupList = document.getElementById('groupList');
    const chatHeader = document.getElementById('chatHeader');
    const chatContent = document.getElementById('chatContent');
    const chatForm = document.getElementById('chatForm');
    const searchInput = document.getElementById('searchInput');
    const searchResult = document.getElementById('searchResult');
    let currentChat = null;

    // Socket.io client (giả sử đã có socket.io client ở app)
    const socket = window.io ? window.io() : null;

    // Khi trang home load, gửi userId lên socket (giả sử có biến userId từ server)
    if (socket && window.userId) {
        socket.emit('login', window.userId);
    }

    function selectChat(type, name) {
        chatHeader.textContent = type === 'friend' ? `Chat với ${name}` : `Nhóm: ${name}`;
        chatContent.innerHTML = '';
        chatForm.style.display = 'flex';
    }

    if (friendList && groupList) {
        [...friendList.querySelectorAll('.sidebar-item'), ...groupList.querySelectorAll('.sidebar-item')].forEach(item => {
            item.addEventListener('click', function () {
                friendList.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                groupList.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                selectChat(this.dataset.type, this.textContent);
            });
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const msg = document.getElementById('messageInput').value.trim();
            if (msg) {
                const div = document.createElement('div');
                div.textContent = 'Bạn: ' + msg;
                chatContent.appendChild(div);
                document.getElementById('messageInput').value = '';
            }
        });
    }

    if (searchInput && friendList) {
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            const val = this.value.trim();
            if (!val) {
                searchResult.innerHTML = '';
                return;
            }
            searchTimeout = setTimeout(() => {
                fetch(`/users/search?username=${encodeURIComponent(val)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.user) {
                            // Nếu đã là bạn thì không hiện nút gửi kết bạn
                            const isFriend = !![...document.querySelectorAll('#friendList .sidebar-item')].find(item => item.textContent.trim() === data.user.username);
                            searchResult.innerHTML = `
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <img src="${data.user.avatar}" alt="avatar" style="width:28px;height:28px;border-radius:50%;">
                                    <span style="font-weight:600;">${data.user.username}</span>
                                    ${isFriend ? '<span style="color:#6ee7b7;">Đã là bạn</span>' : `<button id="addFriendBtn" style="margin-left:10px;padding:6px 14px;border-radius:6px;background:#3b82f6;color:#fff;border:none;cursor:pointer;">Gửi kết bạn</button>`}
                                </div>
                            `;
                            if (!isFriend) {
                                document.getElementById('addFriendBtn').onclick = function () {
                                    fetch('/friends/request', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ to: data.user._id })
                                    })
                                        .then(res => res.json())
                                        .then(result => {
                                            if (result._id) {
                                                searchResult.innerHTML = '<span style="color:#6ee7b7;">Đã gửi lời mời kết bạn!</span>';
                                                if (socket) {
                                                    socket.emit('friendRequest', { to: data.user._id, username: data.user.username });
                                                }
                                            } else {
                                                searchResult.innerHTML = '<span style="color:#f87171;">Gửi kết bạn thất bại!</span>';
                                            }
                                        });
                                };
                            }
                        } else {
                            searchResult.innerHTML = '<span style="color:#888;">Không tìm thấy người dùng</span>';
                        }
                    });
            }, 400);
        });
    }

    // Nhận thông báo kết bạn realtime
    if (socket) {
        socket.on('friendRequestNotify', function (data) {
            // Hiển thị thông báo (demo)
            alert(`Bạn nhận được lời mời kết bạn từ ${data.fromUsername}`);
            // Có thể cập nhật UI, badge, v.v.
        });
    }
});
