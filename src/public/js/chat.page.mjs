import { socket, register } from '/js/socket-client.mjs';
import { initMessages } from '/js/messages.mjs';
import { initFriends } from '/js/friends.mjs';

document.addEventListener('DOMContentLoaded', () => {
    // register + init modules
    if (window.userId) register(window.userId);
    const messagesModule = initMessages({ socket });
    const friendsModule = initFriends({ socket });

    // small helpers moved from inline view
    const deleteBtn = document.getElementById('delete-convo-btn');
    const chatPlaceholder = document.getElementById('chat-placeholder');

    function showDeleteFor(chatType, chatId) {
        if (!deleteBtn) return;
        deleteBtn.dataset.chatType = chatType;
        deleteBtn.dataset.chatId = chatId;
        deleteBtn.style.display = 'inline-flex';
    }
    function hideDelete() {
        if (!deleteBtn) return;
        deleteBtn.dataset.chatType = '';
        deleteBtn.dataset.chatId = '';
        deleteBtn.style.display = 'none';
    }

    // sidebar click hint: keep simple UX (messages.mjs handles opening)
    document.addEventListener('click', (e) => {
        const friendItem = e.target.closest('.chat-item.friend-profile');
        const groupItem = e.target.closest('.chat-item[data-type="group"]');
        if (friendItem) {
            showDeleteFor('friend', friendItem.dataset.id);
            if (chatPlaceholder) chatPlaceholder.style.display = 'none';
            return;
        }
        if (groupItem) {
            showDeleteFor('group', groupItem.dataset.id);
            if (chatPlaceholder) chatPlaceholder.style.display = 'none';
            return;
        }
        if (!e.target.closest('.chat-sidebar') && !e.target.closest('#delete-convo-btn')) {
            const active = document.querySelector('.chat-item.active');
            if (!active) hideDelete();
        }
    });

    async function doDeleteConversation(chatType, chatId) {
        if (!chatType || !chatId) return;
        const ok = window.UI && window.UI.confirm ? await window.UI.confirm('Xóa cuộc trò chuyện sẽ xóa toàn bộ tin nhắn. Bạn chắc chắn?') : confirm('Xóa cuộc trò chuyện sẽ xóa toàn bộ tin nhắn. Bạn chắc chắn?');
        if (!ok) return;
        try {
            const r = await fetch('/api/messages/delete-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ chatType, chatId })
            });
            if (r.status === 401) return window.location.href = '/login';
            const j = await r.json();
            if (j && j.success) {
                const chatBox = document.getElementById('chat-box');
                if (chatBox) chatBox.innerHTML = '<div class="system-message">Bạn đã xóa cuộc trò chuyện này.</div>';
                hideDelete();
                window.AVChat = window.AVChat || {};
                window.AVChat.currentChat = null;
                const li = document.querySelector(`.chat-item[data-id="${chatId}"]`);
                if (li) li.classList.remove('active');
            } else {
                if (window.UI && window.UI.alert) await window.UI.alert(j && j.error ? j.error : 'Xóa thất bại'); else alert(j && j.error ? j.error : 'Xóa thất bại');
            }
        } catch (err) {
            console.error(err);
            if (window.UI && window.UI.alert) await window.UI.alert('Lỗi khi xóa cuộc trò chuyện'); else alert('Lỗi khi xóa cuộc trò chuyện');
        }
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            const chatType = deleteBtn.dataset.chatType || (window.AVChat && window.AVChat.currentChat && window.AVChat.currentChat.type);
            const chatId = deleteBtn.dataset.chatId || (window.AVChat && window.AVChat.currentChat && window.AVChat.currentChat.id);
            await doDeleteConversation(chatType, chatId);
        });
    }

    // remove friend -> API
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.remove-friend-btn');
        if (!btn) return;
        e.stopPropagation();
        const friendId = btn.dataset.id;
        const ok = window.UI && window.UI.confirm ? await window.UI.confirm('Bạn có chắc muốn xóa bạn này?') : confirm('Bạn có chắc muốn xóa bạn này?');
        if (!ok) return;
        try {
            const res = await fetch('/api/friends/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ friendId })
            });
            if (res.status === 401) return window.location.href = '/login';
            const jr = await res.json();
            if (jr && jr.success) {
                const el = btn.closest('.friend-profile') || btn.closest('.chat-item.friend-profile');
                if (el) el.remove();
            } else {
                if (window.UI && window.UI.alert) await window.UI.alert(jr && jr.error ? jr.error : 'Lỗi xóa bạn'); else alert(jr && jr.error ? jr.error : 'Lỗi xóa bạn');
            }
        } catch (err) {
            console.error(err);
            if (window.UI && window.UI.alert) await window.UI.alert('Lỗi xóa bạn'); else alert('Lỗi xóa bạn');
        }
    });

    // delete group
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-group-btn');
        if (!btn) return;
        e.stopPropagation();
        const groupId = btn.dataset.id;
        if (!groupId) return;
        const ok = window.UI && window.UI.confirm ? await window.UI.confirm('Xóa nhóm sẽ xóa nhóm và toàn bộ tin nhắn. Bạn chắc chắn?') : confirm('Xóa nhóm sẽ xóa nhóm và toàn bộ tin nhắn. Bạn chắc chắn?');
        if (!ok) return;
        try {
            const r = await fetch('/api/groups/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ groupId })
            });
            if (r.status === 401) return window.location.href = '/login';
            const j = await r.json();
            if (j && j.success) {
                const li = document.querySelector(`.chat-item[data-type="group"][data-id="${groupId}"]`);
                if (li && li.parentNode) li.parentNode.removeChild(li);
                const active = document.querySelector('.chat-item.active[data-type="group"][data-id="' + groupId + '"]');
                if (active) {
                    const chatBox = document.getElementById('chat-box');
                    if (chatBox) chatBox.innerHTML = '<div class="system-message">Nhóm đã bị xóa.</div>';
                    hideDelete();
                    window.AVChat = window.AVChat || {};
                    window.AVChat.currentChat = null;
                }
                if (window.UI && window.UI.alert) await window.UI.alert('Xóa nhóm thành công');
            } else {
                if (window.UI && window.UI.alert) await window.UI.alert(j && j.error ? j.error : 'Xóa thất bại'); else alert(j && j.error ? j.error : 'Xóa thất bại');
            }
        } catch (err) {
            console.error(err);
            if (window.UI && window.UI.alert) await window.UI.alert('Lỗi khi xóa nhóm'); else alert('Lỗi khi xóa nhóm');
        }
    });

    // Create group modal wiring
    (function () {
        const openBtn = document.getElementById('create-group-btn');
        const modal = document.getElementById('create-group-modal');
        const cancel = document.getElementById('create-group-cancel');
        const confirm = document.getElementById('create-group-confirm');
        const membersList = document.getElementById('group-members-list');
        const nameInput = document.getElementById('group-name-input');

        function buildMembers() {
            if (!membersList) return;
            membersList.innerHTML = '';
            document.querySelectorAll('.chat-item.friend-profile').forEach(li => {
                const id = li.dataset.id;
                const username = li.querySelector('.friend-username') ? li.querySelector('.friend-username').textContent : id;
                const row = document.createElement('div');
                row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.justifyContent = 'space-between';
                row.style.padding = '6px 8px';
                row.innerHTML = `<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" data-id="${id}" /> <span style="color:#cfe7ff">${username}</span></label>`;
                membersList.appendChild(row);
            });
        }

        if (openBtn) openBtn.addEventListener('click', () => {
            buildMembers();
            if (nameInput) nameInput.value = '';
            if (modal) modal.style.display = 'flex';
        });
        if (cancel) cancel.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });

        if (confirm) confirm.addEventListener('click', async () => {
            const name = (nameInput && nameInput.value || '').trim();
            const selected = membersList ? Array.from(membersList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.id) : [];
            if (!name) { if (window.UI && window.UI.alert) await window.UI.alert('Nhập tên nhóm'); else alert('Nhập tên nhóm'); return; }
            if (!selected || selected.length < 2) { if (window.UI && window.UI.alert) await window.UI.alert('Chọn ít nhất 2 bạn'); else alert('Chọn ít nhất 2 bạn'); return; }
            confirm.disabled = true;
            try {
                const r = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name, members: selected }) });
                if (r.status === 401) return window.location.href = '/login';
                const j = await r.json();
                if (j && j.success && j.group) {
                    const ul = document.getElementById('groups');
                    if (ul) {
                        const li = document.createElement('li');
                        li.className = 'chat-item';
                        li.dataset.type = 'group';
                        li.dataset.id = String(j.group._id);
                        li.innerHTML = `<span style="flex:1;">${j.group.name}</span><button class="delete-group-btn" data-id="${j.group._id}" title="Xóa lịch sử nhóm" style="margin-left:8px;background:transparent;border:none;color:#ef4444;cursor:pointer;">🗑️</button>`;
                        ul.insertBefore(li, ul.firstChild);
                        li.click();
                        if (socket && socket.emit) socket.emit('join-group', String(j.group._id));
                    }
                    if (modal) modal.style.display = 'none';
                } else {
                    if (window.UI && window.UI.alert) await window.UI.alert(j && j.error ? j.error : 'Tạo nhóm thất bại'); else alert(j && j.error ? j.error : 'Tạo nhóm thất bại');
                }
            } catch (e) { console.error(e); if (window.UI && window.UI.alert) await window.UI.alert('Lỗi tạo nhóm'); else alert('Lỗi tạo nhóm'); }
            confirm.disabled = false;
        });
    })();
});
