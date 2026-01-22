import UI from './ui.mjs';

// Chat Module
export function initMessages({ socket } = {}) {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('send-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const createGroupBtn = document.getElementById('create-group-btn');

    function getDeleteBtn() { return document.getElementById('delete-convo-btn'); }
    const EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🔥', '🙏', '😢', '😎', '🤔', '😅', '👏', '💯', '🎁', '🥳'];
    const GROUP_PINNED_KEY = 'vachat.groupPinned';
    const GROUP_MUTED_KEY = 'vachat.groupMuted';

    function loadIdSet(key) {
        try {
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            return new Set(Array.isArray(arr) ? arr.map(String) : []);
        } catch (e) { return new Set(); }
    }
    function saveIdSet(key, set) {
        try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) { }
    }

    function getFriendInfo(friendId) {
        const friendItem = document.querySelector(`.chat-item.friend-profile[data-id="${friendId}"]`);
        if (!friendItem) return {};
        const avatarImg = friendItem.querySelector('.avatar');
        const avatar = avatarImg && avatarImg.tagName === 'IMG' ? avatarImg.src : undefined;
        const usernameSpan = friendItem.querySelector('.friend-username');
        const username = usernameSpan ? usernameSpan.textContent : '';
        return { avatar, username };
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Floating tooltip for create group button
    let floatingTooltip;
    function ensureFloatingTooltip() {
        if (floatingTooltip) return floatingTooltip;
        const el = document.createElement('div');
        el.className = 'floating-tooltip';
        el.style.display = 'none';
        document.body.appendChild(el);
        floatingTooltip = el;
        return el;
    }
    function showFloatingTooltip(target, text) {
        if (!target) return;
        const tip = ensureFloatingTooltip();
        tip.textContent = text || '';
        tip.style.display = 'block';
        const rect = target.getBoundingClientRect();
        const offset = 10;
        let left = rect.right + offset;
        let top = rect.top + rect.height / 2;
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
        tip.style.transform = 'translateY(-50%)';
        requestAnimationFrame(() => {
            const tRect = tip.getBoundingClientRect();
            const maxX = window.innerWidth - tRect.width - 8;
            const maxY = window.innerHeight - tRect.height - 8;
            if (left > maxX) left = rect.left - tRect.width - offset;
            if (left < 8) left = 8;
            let y = top - tRect.height / 2;
            if (y < 8) y = 8;
            if (y > maxY) y = maxY;
            tip.style.left = `${left}px`;
            tip.style.top = `${y}px`;
            tip.style.transform = 'none';
        });
    }
    function hideFloatingTooltip() {
        if (floatingTooltip) floatingTooltip.style.display = 'none';
    }
    const privateChatItem = document.getElementById('private-chat-item');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('mouseenter', () => {
            const text = createGroupBtn.getAttribute('data-tooltip') || 'Tạo nhóm Chat mới';
            showFloatingTooltip(createGroupBtn, text);
        });
        createGroupBtn.addEventListener('mouseleave', hideFloatingTooltip);
        createGroupBtn.addEventListener('blur', hideFloatingTooltip);
        window.addEventListener('scroll', hideFloatingTooltip, true);
    }
    function setPrivateActive(active) {
        if (!privateChatItem) return;
        privateChatItem.classList.toggle('active', !!active);
    }
    if (privateChatItem) {
        privateChatItem.addEventListener('mouseenter', () => {
            const text = privateChatItem.getAttribute('data-tooltip') || 'Tin nhắn riêng tư';
            showFloatingTooltip(privateChatItem, text);
        });
        privateChatItem.addEventListener('mouseleave', hideFloatingTooltip);
        privateChatItem.addEventListener('blur', hideFloatingTooltip);
        privateChatItem.addEventListener('click', () => {
            document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
            setPrivateActive(true);
            window.VAChat = window.VAChat || {};
            window.VAChat.currentChat = null;
            persistCurrentChat();
            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'flex';
            const chatBox = document.getElementById('chat-box'); if (chatBox) chatBox.innerHTML = '<div class="system-message">Chọn bạn bè để bắt đầu nhắn tin.</div>';
            const dd = getDeleteBtn(); if (dd) { dd.style.display = 'none'; dd.dataset.chatId = ''; dd.dataset.chatType = ''; }
            setInputVisible(false);
        });
    }

    window.VAChat = window.VAChat || {};
    if (!window.VAChat._recentMsgKeys) window.VAChat._recentMsgKeys = new Map();
    function makeMsgKey(obj) {
        try {
            const chatId = (obj.chat && obj.chat.id) || (window.VAChat.currentChat && window.VAChat.currentChat.id) || '';
            const from = String(obj.from || '');
            const text = String(obj.message || obj.content || '').slice(0, 140);
            const ts = obj.createdAt ? String(new Date(obj.createdAt).getTime()) : '';
            return `${chatId}::${from}::${text}::${ts}`;
        } catch (e) { return Math.random().toString(36).slice(2); }
    }
    function isDuplicate(obj, windowMs = 2000) {
        const k = makeMsgKey(obj);
        const now = Date.now();
        const prev = window.VAChat._recentMsgKeys.get(k);
        if (prev && (now - prev) < windowMs) return true;
        window.VAChat._recentMsgKeys.set(k, now);
        setTimeout(() => { window.VAChat._recentMsgKeys.delete(k); }, 30000);
        return false;
    }

    function appendMessage(data) {
        if (!chatBox) return;
        const payload = Object.assign({}, data);
        if (isDuplicate(payload)) return;
        const div = document.createElement('div');
        div.className = 'message' + (payload.isSelf ? ' self' : '');
        const text = payload.message || payload.content || '';
        if (!payload.isSelf) {
            const { avatar, username } = getFriendInfo(payload.from);
            div.innerHTML = `
                <div style="display:flex;align-items:flex-end;gap:8px;">
                    <img src="${avatar || '/public/avatar.png'}" class="avatar" style="width:28px;height:28px;">
                    <div>
                        <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${escapeHtml(username || '')}</div>
                        <div>${escapeHtml(String(text || ''))}</div>
                    </div>
                </div>`;
        } else {
            div.textContent = String(text || '');
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;

        window.VAChat.lastMessages = window.VAChat.lastMessages || [];
        window.VAChat.lastMessages.push({
            content: text,
            isSelf: !!payload.isSelf,
            from: payload.from != null ? String(payload.from) : null,
            createdAt: payload.createdAt || new Date()
        });
        if (window.VAChat.lastMessages.length > 200) window.VAChat.lastMessages = window.VAChat.lastMessages.slice(-200);
    }

    function renderMessages(messages = []) {
        if (!chatBox) return;
        chatBox.innerHTML = '';
        if (!messages.length) {
            const div = document.createElement('div');
            div.className = 'system-message';
            div.textContent = 'Bạn đã bắt đầu cuộc trò chuyện.';
            chatBox.appendChild(div);
            return;
        }
        messages.forEach(msg => {
            appendMessage({ message: msg.content, from: msg.from, isSelf: !!msg.isSelf, createdAt: msg.createdAt, chat: { id: (window.VAChat.currentChat && window.VAChat.currentChat.id) || '' } });
        });
        chatBox.scrollTop = chatBox.scrollHeight;
        window.VAChat.lastMessages = (messages || []).map(m => ({ content: m.content, isSelf: !!m.isSelf, from: m.from != null ? String(m.from) : null, createdAt: m.createdAt || null })).slice(-200);
    }

    function setSendEnabled(enabled) {
        if (sendBtn) sendBtn.disabled = !enabled;
        if (input) input.disabled = !enabled;
    }

    function setInputVisible(visible) {
        if (!form) return;
        form.style.display = visible ? 'flex' : 'none';
    }

    function showLoading() {
        if (!chatBox) return;
        const el = document.createElement('div');
        el.id = 'messages-loading';
        el.className = 'chat-loading';
        el.innerHTML = `<div class="chat-spinner"></div>`;
        chatBox.innerHTML = '';
        chatBox.appendChild(el);
    }
    function hideLoading() { const el = document.getElementById('messages-loading'); if (el && el.parentNode) el.parentNode.removeChild(el); }

    const dbtn = getDeleteBtn();
    if (dbtn) { dbtn.style.display = 'none'; dbtn.dataset.chatId = ''; dbtn.dataset.chatType = ''; }

    async function loadMessages(chatType, chatId) {
        if (!chatType || !chatId) {
            setSendEnabled(false);
            setInputVisible(false);
            const dd = getDeleteBtn();
            if (dd) { dd.style.display = 'none'; dd.dataset.chatId = ''; dd.dataset.chatType = ''; }
            return;
        }
        setInputVisible(chatType === 'friend' || chatType === 'group');
        setSendEnabled(false);
        showLoading();
        try {
            const res = await fetch(`/api/messages?chatType=${encodeURIComponent(chatType)}&chatId=${encodeURIComponent(chatId)}`, { method: 'GET', credentials: 'same-origin' });
            if (res.status === 401) return window.location.href = '/login';
            const data = await res.json();
            hideLoading();
            renderMessages(data.messages || []);
            window.VAChat = window.VAChat || {};
            window.VAChat.lastMessages = data.messages || [];
            if (data.messages && data.messages.length > 0) {
                // optional: scroll to bottom
            }
            setSendEnabled(true);

            const dd = getDeleteBtn();
            if (dd) { dd.style.display = 'inline-flex'; dd.dataset.chatId = chatId; dd.dataset.chatType = chatType; }

            if (chatType === 'group' && socket && socket.emit) socket.emit('join-group', chatId);

            try { window.dispatchEvent(new CustomEvent('conversation-opened', { detail: { chatType, chatId } })); } catch (e) { }
        } catch (err) {
            console.error('loadMessages error', err);
            hideLoading();
            setSendEnabled(true);
        }
    }

    function persistCurrentChat() {
        try {
            if (window.VAChat && window.VAChat.currentChat) {
                localStorage.setItem('vachat.lastChat', JSON.stringify(window.VAChat.currentChat));
            } else {
                localStorage.removeItem('vachat.lastChat');
            }
        } catch (e) { /* noop */ }
    }
    window.addEventListener('beforeunload', persistCurrentChat);

    let savedChat = null;
    try {
        const saved = localStorage.getItem('vachat.lastChat');
        if (saved) {
            savedChat = JSON.parse(saved);
            const last = savedChat;
            if (last && last.type === 'group') {
                // default to private chat instead of last group
                setPrivateActive(true);
                window.VAChat.currentChat = null;
                const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'flex';
                setInputVisible(false);
            } else if (last && last.type && last.id) {
                const sel = last.type === 'friend' ? `.chat-item.friend-profile[data-id="${String(last.id)}"]` : `.chat-item[data-type="group"][data-id="${String(last.id)}"]`;
                const el = document.querySelector(sel);
                if (el) {
                    document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
                    el.classList.add('active');
                }
                window.VAChat.currentChat = { type: last.type, id: last.id };
                setPrivateActive(last.type === 'friend');
                setInputVisible(last.type === 'friend' || last.type === 'group');
                setTimeout(() => { loadMessages(last.type, last.id).catch(() => { }); }, 120);
            }
        }
    } catch (e) { /* noop */ }

    if (!savedChat) {
        setPrivateActive(true);
        setInputVisible(false);
    }

    window.VAChat = window.VAChat || {};
    window.VAChat.loadMessages = loadMessages;
    window.VAChat.currentChat = window.VAChat.currentChat || null;
    window.VAChat.showDeleteFor = (t, id) => { const dd = getDeleteBtn(); if (!dd) return; dd.dataset.chatType = t; dd.dataset.chatId = id; dd.style.display = 'inline-flex'; };

    const friendsList = document.getElementById('friends');
    if (friendsList) {
        friendsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item.friend-profile');
            if (!item) return;
            document.querySelectorAll('.chat-item.friend-profile.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            setPrivateActive(false);
            const chatId = item.dataset.id;
            window.VAChat.currentChat = { type: 'friend', id: chatId };
            persistCurrentChat();
            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'none';
            await loadMessages('friend', chatId);
            if (input) input.focus();
            const badge = item.querySelector('.unread-badge'); if (badge) badge.style.display = 'none';
            if (window.VAChat.pendingMessages) delete window.VAChat.pendingMessages[chatId];
            window.VAChat.showDeleteFor('friend', chatId);
        });
    }

    const groupsList = document.getElementById('groups');
    const pinnedSet = loadIdSet(GROUP_PINNED_KEY);
    const mutedSet = loadIdSet(GROUP_MUTED_KEY);

    function applyGroupState(item) {
        if (!item) return;
        const id = String(item.dataset.id || '');
        item.classList.toggle('pinned', pinnedSet.has(id));
        item.classList.toggle('muted', mutedSet.has(id));
    }

    function sortGroups() {
        if (!groupsList) return;
        const items = Array.from(groupsList.querySelectorAll('.chat-item[data-type="group"]'));
        const pinnedIds = Array.from(pinnedSet);
        const pinnedItems = pinnedIds.map(id => items.find(i => String(i.dataset.id) === String(id))).filter(Boolean);
        const others = items.filter(i => !pinnedSet.has(String(i.dataset.id)));
        [...pinnedItems, ...others].forEach(el => groupsList.appendChild(el));
    }

    if (groupsList) {
        Array.from(groupsList.querySelectorAll('.chat-item[data-type="group"]')).forEach(applyGroupState);
        sortGroups();

        // Tooltip for group name on hover
        groupsList.addEventListener('mouseover', (e) => {
            const item = e.target.closest('.chat-item[data-type="group"]');
            if (!item) return;
            const name = item.dataset.groupName || '';
            if (!name) return;
            const avatar = item.querySelector('.group-avatar') || item;
            showFloatingTooltip(avatar, name);
        });
        groupsList.addEventListener('mouseout', (e) => {
            const item = e.target.closest('.chat-item[data-type="group"]');
            if (!item) return;
            const related = e.relatedTarget;
            if (related && item.contains(related)) return;
            hideFloatingTooltip();
        });
    }
    if (groupsList) {
        groupsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item[data-type="group"]');
            if (!item) return;
            document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            setPrivateActive(false);
            const chatId = item.dataset.id;
            window.VAChat.currentChat = { type: 'group', id: chatId };
            persistCurrentChat();
            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'none';
            await loadMessages('group', chatId);
            if (input) input.focus();
            window.VAChat.showDeleteFor('group', chatId);
            setInputVisible(true);
        });
    }

    // Group context menu (right click)
    const groupMenu = document.getElementById('group-context-menu');
    const groupMenuMute = groupMenu ? groupMenu.querySelector('[data-action="toggle-mute"]') : null;
    const groupMenuPin = groupMenu ? groupMenu.querySelector('[data-action="toggle-pin"]') : null;
    const groupMenuRead = groupMenu ? groupMenu.querySelector('[data-action="mark-read"]') : null;
    const groupMenuLeave = groupMenu ? groupMenu.querySelector('[data-action="leave-group"]') : null;

    function hideGroupMenu() {
        if (!groupMenu) return;
        groupMenu.style.display = 'none';
        groupMenu.dataset.groupId = '';
    }

    function openGroupMenu(item, x, y) {
        if (!groupMenu || !item) return;
        const id = String(item.dataset.id || '');
        groupMenu.dataset.groupId = id;
        if (groupMenuMute) groupMenuMute.textContent = mutedSet.has(id) ? 'Bỏ im lặng' : 'Im lặng';
        if (groupMenuPin) groupMenuPin.textContent = pinnedSet.has(id) ? 'Bỏ ghim' : 'Ghim';
        if (groupMenuRead) groupMenuRead.textContent = 'Đánh dấu đã đọc';
        if (groupMenuLeave) groupMenuLeave.textContent = 'Rời nhóm chat';

        groupMenu.style.display = 'block';
        groupMenu.style.left = '0px';
        groupMenu.style.top = '0px';
        requestAnimationFrame(() => {
            const rect = groupMenu.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width - 8;
            const maxY = window.innerHeight - rect.height - 8;
            groupMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
            groupMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
        });
    }

    document.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.chat-item[data-type="group"]');
        if (!item) return;
        e.preventDefault();
        openGroupMenu(item, e.clientX, e.clientY);
    });

    document.addEventListener('click', (e) => {
        if (groupMenu && groupMenu.style.display === 'block') {
            if (!e.target.closest('#group-context-menu')) hideGroupMenu();
        }
    });

    if (groupMenu) {
        groupMenu.addEventListener('click', async (e) => {
            const action = e.target && e.target.dataset ? e.target.dataset.action : '';
            if (!action) return;
            const groupId = groupMenu.dataset.groupId;
            if (!groupId) return;

            const item = groupsList ? groupsList.querySelector(`.chat-item[data-type="group"][data-id="${groupId}"]`) : null;

            if (action === 'mark-read') {
                if (item) {
                    const badge = item.querySelector('.unread-badge');
                    if (badge) badge.style.display = 'none';
                }
                hideGroupMenu();
                return;
            }

            if (action === 'toggle-mute') {
                if (mutedSet.has(groupId)) mutedSet.delete(groupId); else mutedSet.add(groupId);
                saveIdSet(GROUP_MUTED_KEY, mutedSet);
                applyGroupState(item);
                if (groupMenuMute) groupMenuMute.textContent = mutedSet.has(groupId) ? 'Bỏ im lặng' : 'Im lặng';
                hideGroupMenu();
                return;
            }

            if (action === 'toggle-pin') {
                if (pinnedSet.has(groupId)) pinnedSet.delete(groupId); else pinnedSet.add(groupId);
                saveIdSet(GROUP_PINNED_KEY, pinnedSet);
                applyGroupState(item);
                sortGroups();
                if (groupMenuPin) groupMenuPin.textContent = pinnedSet.has(groupId) ? 'Bỏ ghim' : 'Ghim';
                hideGroupMenu();
                return;
            }

            if (action === 'leave-group') {
                const ok = window.UI && window.UI.confirm ? await window.UI.confirm('Rời nhóm sẽ không thể xem lại lịch sử. Bạn chắc chắn?') : confirm('Rời nhóm sẽ không thể xem lại lịch sử. Bạn chắc chắn?');
                if (!ok) return;
                try {
                    const userId = window.userId || (window.VAChat && window.VAChat.userId);
                    if (!userId) throw new Error('Missing userId');
                    const res = await fetch('/api/groups/remove-member', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ groupId, userId })
                    });
                    if (res.status === 401) return window.location.href = '/login';
                    const jr = await res.json();
                    if (jr && jr.success) {
                        if (item) item.remove();
                        pinnedSet.delete(groupId);
                        mutedSet.delete(groupId);
                        saveIdSet(GROUP_PINNED_KEY, pinnedSet);
                        saveIdSet(GROUP_MUTED_KEY, mutedSet);
                        if (window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type === 'group' && String(window.VAChat.currentChat.id) === String(groupId)) {
                            window.VAChat.currentChat = null;
                            persistCurrentChat();
                            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'flex';
                            const chatBox = document.getElementById('chat-box'); if (chatBox) chatBox.innerHTML = '<div class="system-message">Bạn đã rời nhóm chat.</div>';
                            const dd = getDeleteBtn(); if (dd) dd.style.display = 'none';
                        }
                    } else {
                        if (window.UI && window.UI.alert) await window.UI.alert(jr && jr.error ? jr.error : 'Rời nhóm thất bại'); else alert(jr && jr.error ? jr.error : 'Rời nhóm thất bại');
                    }
                } catch (err) {
                    console.error(err);
                    if (window.UI && window.UI.alert) await window.UI.alert('Lỗi rời nhóm'); else alert('Lỗi rời nhóm');
                } finally {
                    hideGroupMenu();
                }
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const active = document.querySelector('.chat-item.active');
            if (!active) {
                if (UI && typeof UI.alert === 'function') await UI.alert('Chọn bạn hoặc nhóm để gửi tin nhắn');
                else alert('Chọn bạn hoặc nhóm để gửi tin nhắn');
                return;
            }
            const chatId = active.dataset.id;
            const chatType = active.dataset.type || (window.VAChat.currentChat && window.VAChat.currentChat.type) || 'friend';
            const text = input.value && input.value.trim();
            if (!text) return;
            if (sendBtn) sendBtn.disabled = true;
            try {
                const resp = await fetch('/api/messages/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ chatType, chatId, message: text })
                });
                if (resp.status === 401) return window.location.href = '/login';
                const result = await resp.json();
                if (result && result.success) {
                    input.value = '';
                } else {
                    if (UI && typeof UI.alert === 'function') await UI.alert(result && result.error ? result.error : 'Không gửi được tin nhắn');
                    else alert(result && result.error ? result.error : 'Không gửi được tin nhắn');
                }
            } catch (err) {
                console.error('send error', err);
                if (UI && typeof UI.alert === 'function') await UI.alert('Lỗi gửi tin nhắn');
                else alert('Lỗi gửi tin nhắn');
            } finally {
                if (sendBtn) sendBtn.disabled = false;
            }
        });
    }

    if (socket) {
        socket.on('chat message', (data) => {
            if (!data || !data.chat) return;
            const active = document.querySelector('.chat-item.active');
            const activeType = active ? (active.dataset.type || (active.classList.contains('friend-profile') ? 'friend' : 'group')) : null;
            const activeId = active ? String(active.dataset.id) : null;
            const chatType = data.chat && data.chat.type;
            const chatId = String(data.chat && data.chat.id);

            const payload = { message: data.message, from: data.from, isSelf: !!data.isSelf, createdAt: data.createdAt, chat: data.chat };

            if (activeType && activeId && String(activeType) === String(chatType) && String(activeId) === String(chatId)) {
                appendMessage(payload);
            } else {
                const selector = chatType === 'friend' ? `.chat-item.friend-profile[data-id="${String(data.from)}"]` : `.chat-item[data-type="group"][data-id="${chatId}"]`;
                const item = document.querySelector(selector);
                if (item) {
                    let badge = item.querySelector('.unread-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'friend-request-badge unread-badge';
                        badge.style.position = 'absolute';
                        badge.style.right = '12px';
                        badge.style.top = '10px';
                        badge.textContent = '1';
                        item.appendChild(badge);
                    } else {
                        const cur = parseInt(badge.textContent || '0', 10);
                        badge.textContent = String(cur + 1);
                        badge.style.display = 'inline-block';
                    }
                }
            }
        });

        socket.on('conversation-deleted', (data) => {
            try {
                if (!data) return;
                const cur = window.VAChat && window.VAChat.currentChat;
                if (cur && String(cur.type) === String(data.chatType) && String(cur.id) === String(data.chatId)) {
                    window.VAChat.currentChat = null;
                    persistCurrentChat();
                    const chatBox = document.getElementById('chat-box');
                    if (chatBox) chatBox.innerHTML = '<div class="system-message">Bạn đã xóa cuộc trò chuyện này.</div>';
                    const li = document.querySelector(`.chat-item[data-id="${data.chatId}"]`);
                    if (li) li.classList.remove('active');
                }
            } catch (e) { /* noop */ }
        });
    }

    function renderEmojiPicker() {
        if (!emojiPicker) return;
        emojiPicker.innerHTML = '';
        EMOJIS.forEach(e => {
            const span = document.createElement('span');
            span.style.cursor = 'pointer';
            span.style.padding = '6px';
            span.style.fontSize = '1.2rem';
            span.textContent = e;
            span.onclick = (ev) => {
                ev.stopPropagation();
                if (input) {
                    const start = input.selectionStart || input.value.length;
                    const end = input.selectionEnd || input.value.length;
                    const v = input.value;
                    input.value = v.slice(0, start) + e + v.slice(end);
                    const pos = start + e.length;
                    input.setSelectionRange(pos, pos);
                    input.focus();
                }
            };
            emojiPicker.appendChild(span);
        });
    }

    function toggleEmojiPicker() {
        if (!emojiPicker) return;
        if (emojiPicker.style.display === 'none' || !emojiPicker.style.display) {
            renderEmojiPicker();
            emojiPicker.style.display = 'flex';
            emojiPicker.style.flexWrap = 'wrap';
            emojiPicker.style.gap = '6px';
            emojiPicker.style.padding = '8px';
            emojiPicker.style.background = '#18181b';
            emojiPicker.style.borderRadius = '8px';
            emojiPicker.style.position = 'absolute';
            emojiPicker.style.bottom = '64px';
            emojiPicker.style.right = '40px';
            emojiPicker.style.zIndex = '9999';
        } else {
            emojiPicker.style.display = 'none';
        }
    }

    document.addEventListener('click', (e) => {
        if (!emojiPicker || !emojiBtn) return;
        if (emojiPicker.style.display === 'none') return;
        if (e.target === emojiBtn || emojiBtn.contains(e.target)) return;
        if (emojiPicker.contains(e.target)) return;
        emojiPicker.style.display = 'none';
    });

    if (emojiBtn) emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleEmojiPicker(); });

    return { loadMessages, appendMessage, renderMessages };
}
