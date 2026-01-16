export function initFriends({ socket } = {}) {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-user');
    const sidebar = document.querySelector('.chat-sidebar');

    function debounce(fn, wait = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    async function doSearch(username) {
        if (!username) return;
        const res = await fetch(`/search-user?username=${encodeURIComponent(username)}`, { method: 'GET', credentials: 'same-origin' });
        if (res.status === 401) return window.location.href = '/login';
        return res.json();
    }

    function renderSearchResult(data) {
        const old = document.getElementById('profile-search-result');
        if (old) old.remove();
        let html = '';
        if (data.error) {
            html = `<div class="system-message">${data.error}</div>`;
        } else {
            const btnHtml = data.pending
                ? `<button id="cancel-friend-btn" class="btn" data-id="${data._id}" style="background:#ef4444;">Thu hồi</button>`
                : `<button id="add-friend-btn" class="btn" data-id="${data._id}">Gửi kết bạn</button>`;
            html = `
				<div class="profile-search" id="profile-search-result">
					<img src="${data.avatar}" class="avatar" style="width:48px;height:48px;">
					<div class="profile-info">
						<div class="profile-username">${data.username}</div>
						${btnHtml}
					</div>
				</div>`;
        }
        if (sidebar && sidebar.querySelector('.friend-list')) {
            sidebar.querySelector('.friend-list').insertAdjacentHTML('afterbegin', html);
            const addBtn = document.getElementById('add-friend-btn');
            if (addBtn) addBtn.onclick = async () => {
                const toId = addBtn.dataset.id;
                addBtn.disabled = true;
                try {
                    const r = await fetch('/add-friend', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ toId })
                    });
                    if (r.status === 401) return window.location.href = '/login';
                    const jr = await r.json();
                    addBtn.textContent = jr.error ? jr.error : 'Đã gửi!';
                } catch (err) {
                    console.error(err);
                    addBtn.textContent = 'Lỗi';
                }
                setTimeout(() => { const profileDiv = document.getElementById('profile-search-result'); if (profileDiv) profileDiv.remove(); searchInput.value = ''; }, 900);
            };
            const cancelBtn = document.getElementById('cancel-friend-btn');
            if (cancelBtn) cancelBtn.onclick = async () => {
                const toId = cancelBtn.dataset.id;
                cancelBtn.disabled = true;
                try {
                    const r = await fetch('/cancel-friend-request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ toId })
                    });
                    if (r.status === 401) return window.location.href = '/login';
                } catch (err) { console.error(err); }
                cancelBtn.textContent = 'Đã thu hồi!';
                setTimeout(() => { const profileDiv = document.getElementById('profile-search-result'); if (profileDiv) profileDiv.remove(); searchInput.value = ''; }, 900);
            };
        }
    }

    const debouncedSearch = debounce(async () => {
        const username = searchInput.value.trim();
        if (!username) return;
        try {
            const data = await doSearch(username);
            renderSearchResult(data);
        } catch (err) {
            if (sidebar && sidebar.querySelector('.friend-list')) sidebar.querySelector('.friend-list').insertAdjacentHTML('afterbegin', `<div class="system-message">Lỗi kết nối server!</div>`);
        }
    }, 300);

    if (searchBtn && searchInput) {
        searchBtn.onclick = (e) => { e.preventDefault(); debouncedSearch(); };
        searchInput.onkeyup = () => debouncedSearch();
    }

    // realtime friend notifications
    if (socket) {
        socket.on('friend-request', (data) => {
            if (String(data.toId) !== String(window.userId)) return;
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
				</div>`;
            document.body.appendChild(popup);
            popup.querySelector('#accept-friend-btn').onclick = async () => {
                // call accept API (reload handled by caller)
                await fetch('/accept-friend-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ requestId: data.requestId }) }).catch(() => { });
                popup.remove();
                location.reload();
            };
            popup.querySelector('#reject-friend-btn').onclick = () => { popup.remove(); };
        });

        socket.on('friend-accepted', (data) => {
            if (String(data.toId) !== String(window.userId)) return;
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
				</div>`;
            document.body.appendChild(popup);
            popup.querySelector('#close-accepted-btn').onclick = () => { popup.remove(); location.reload(); };
            setTimeout(() => { if (popup.parentNode) popup.remove(); location.reload(); }, 2000);
        });
    }
}
