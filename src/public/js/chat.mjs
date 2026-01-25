import UI from './ui.mjs';

// Chat Module
export function initMessages({ socket } = {}) {
    document.addEventListener('contextmenu', (e) => {
        if (!e.target.closest('.context-menu')) e.preventDefault();
    });
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
    const FRIEND_PINNED_KEY = 'vachat.friendPinned';
    const FRIEND_MUTED_KEY = 'vachat.friendMuted';
    const STREAK_STORE_KEY = 'vachat.streakMap';
    const NOTIF_STORE_KEY = 'vachat.notifications';

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

    function loadStreakMap() {
        try {
            const raw = localStorage.getItem(STREAK_STORE_KEY);
            const obj = raw ? JSON.parse(raw) : {};
            return obj && typeof obj === 'object' ? obj : {};
        } catch (e) { return {}; }
    }
    function saveStreakMap(map) {
        try { localStorage.setItem(STREAK_STORE_KEY, JSON.stringify(map || {})); } catch (e) { }
    }
    function streakKey(chatType, chatId) {
        return `${String(chatType)}:${String(chatId)}`;
    }
    function renderStreakBadge(item, streak) {
        if (!item) return;
        let badge = item.querySelector('.streak-badge');
        if (streak >= 2) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'streak-badge';
                item.appendChild(badge);
            }
            badge.textContent = `🔥${streak}`;
            badge.title = `Streak ${streak} ngày`;
        } else if (badge) {
            badge.remove();
        }
    }
    function setStoredStreak(chatType, chatId, streak, lastDay) {
        const map = loadStreakMap();
        const key = streakKey(chatType, chatId);
        if (streak >= 2) map[key] = { streak, lastDay: lastDay ?? null, updatedAt: Date.now() };
        else delete map[key];
        saveStreakMap(map);
    }
    function applyStoredStreakBadges() {
        const map = loadStreakMap();
        const items = [
            ...Array.from(document.querySelectorAll('.chat-item.friend-profile')),
            ...Array.from(document.querySelectorAll('.chat-item[data-type="group"]'))
        ];
        items.forEach(item => {
            const type = item.classList.contains('friend-profile') ? 'friend' : (item.dataset.type || 'group');
            const id = item.dataset.id;
            const key = streakKey(type, id);
            const entry = map[key];
            renderStreakBadge(item, entry && entry.streak ? entry.streak : 0);
        });
    }

    function getChatItem(chatType, chatId) {
        if (!chatType || !chatId) return null;
        if (chatType === 'friend') return document.querySelector(`.chat-item.friend-profile[data-id="${String(chatId)}"]`);
        if (chatType === 'group') return document.querySelector(`.chat-item[data-type="group"][data-id="${String(chatId)}"]`);
        return null;
    }

    function emitFriendMarkRead(chatId, messageIds) {
        if (!socket || !socket.emit) return;
        if (!chatId || !Array.isArray(messageIds) || !messageIds.length) return;
        socket.emit('friend-mark-read', String(chatId), messageIds.map(String));
    }

    function toDayNumber(d) {
        const dt = (d instanceof Date) ? d : new Date(d);
        if (Number.isNaN(dt.getTime())) return null;
        return Math.floor(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime() / 86400000);
    }

    function formatDateLabel(dayNum) {
        const today = toDayNumber(new Date());
        const yesterday = today - 1;
        if (dayNum === today) return 'Hôm nay';
        if (dayNum === yesterday) return 'Hôm qua';
        const d = new Date(dayNum * 86400000);
        return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatTimeLabel(d) {
        const dt = (d instanceof Date) ? d : new Date(d);
        if (Number.isNaN(dt.getTime())) return '';
        const time = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const date = dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${time} • ${date}`;
    }

    function calculateStreak(messages = []) {
        const dayNums = Array.from(new Set(
            (messages || [])
                .map(m => toDayNumber(m.createdAt || m.createdAtAt || m.time || m.timestamp || m.date))
                .filter(v => v != null)
        )).sort((a, b) => b - a);
        if (!dayNums.length) return { streak: 0, lastDay: null };
        const today = toDayNumber(new Date());
        if (dayNums[0] !== today) return { streak: 0, lastDay: dayNums[0] };
        let streak = 1;
        for (let i = 1; i < dayNums.length; i += 1) {
            if (dayNums[i - 1] - dayNums[i] === 1) streak += 1;
            else break;
        }
        return { streak, lastDay: dayNums[0] };
    }

    function updateStreakBadge(chatType, chatId, messages) {
        const item = getChatItem(chatType, chatId);
        const result = calculateStreak(messages);
        if (item) renderStreakBadge(item, result.streak);
        setStoredStreak(chatType, chatId, result.streak, result.lastDay);
    }

    function updateStreakFromMessage(chatType, chatId, createdAt) {
        const dayNum = toDayNumber(createdAt);
        if (dayNum == null) return;
        const map = loadStreakMap();
        const key = streakKey(chatType, chatId);
        const entry = map[key] || { streak: 0, lastDay: null };
        if (entry.lastDay === dayNum) {
            // no change
        } else if (entry.lastDay === dayNum - 1) {
            entry.streak = (entry.streak || 0) + 1;
            entry.lastDay = dayNum;
        } else {
            entry.streak = 1;
            entry.lastDay = dayNum;
        }
        map[key] = entry;
        saveStreakMap(map);
        const item = getChatItem(chatType, chatId);
        if (item) renderStreakBadge(item, entry.streak);
    }

    function clearAllStreakBadges() {
        document.querySelectorAll('.streak-badge').forEach(b => b.remove());
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

    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifList = document.getElementById('notif-list');
    const notifEmpty = document.getElementById('notif-empty');
    const notifBadge = document.getElementById('notif-badge');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const userSettingsBtn = document.getElementById('user-settings-btn');
    const userSettingsModal = document.getElementById('user-settings-modal');
    const userSettingsClose = document.getElementById('user-settings-close');

    function loadNotifications() {
        try {
            const raw = localStorage.getItem(NOTIF_STORE_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) { return []; }
    }
    function saveNotifications(list) {
        try { localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(list || [])); } catch (e) { }
    }
    function formatRelative(ts) {
        const t = new Date(ts);
        const diff = Date.now() - t.getTime();
        if (Number.isNaN(diff)) return '';
        const min = Math.floor(diff / 60000);
        const hour = Math.floor(diff / 3600000);
        const day = Math.floor(diff / 86400000);
        if (min < 1) return 'Vừa xong';
        if (min < 60) return `${min} phút trước`;
        if (hour < 24) return `${hour} giờ trước`;
        if (day < 7) return `${day} ngày trước`;
        return t.toLocaleDateString('vi-VN');
    }
    function updateNotifBadge(list) {
        if (!notifBadge) return;
        const count = (list || []).length;
        if (!count) { notifBadge.style.display = 'none'; return; }
        notifBadge.textContent = String(count);
        notifBadge.style.display = 'inline-block';
    }
    function renderNotifications() {
        if (!notifList || !notifEmpty) return;
        const list = loadNotifications();
        notifList.innerHTML = '';
        list.forEach((n, idx) => {
            const item = document.createElement('div');
            item.className = 'notif-item';
            item.innerHTML = `
                <div>
                    <div class="notif-text">${escapeHtml(n.text || '')}</div>
                    <div class="notif-time">${escapeHtml(formatRelative(n.createdAt))}</div>
                </div>
                <button class="notif-remove" data-index="${idx}" title="Xóa">✕</button>
            `;
            notifList.appendChild(item);
        });
        notifEmpty.style.display = list.length ? 'none' : 'block';
        updateNotifBadge(list);
    }
    function addNotification(text) {
        const list = loadNotifications();
        list.unshift({ text: String(text || ''), createdAt: Date.now() });
        if (list.length > 50) list.length = 50;
        saveNotifications(list);
        renderNotifications();
    }
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = notifDropdown.style.display === 'block';
            notifDropdown.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) renderNotifications();
        });
        document.addEventListener('click', () => {
            if (notifDropdown.style.display === 'block') notifDropdown.style.display = 'none';
            if (settingsDropdown && settingsDropdown.style.display === 'block') settingsDropdown.style.display = 'none';
        });
    }
    if (settingsBtn && settingsDropdown) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = settingsDropdown.style.display === 'block';
            settingsDropdown.style.display = isOpen ? 'none' : 'block';
            if (notifDropdown && notifDropdown.style.display === 'block') notifDropdown.style.display = 'none';
        });
    }
    if (userSettingsBtn) {
        userSettingsBtn.addEventListener('click', async () => {
            if (settingsDropdown) settingsDropdown.style.display = 'none';
            if (userSettingsModal) userSettingsModal.style.display = 'flex';
        });
    }
    if (userSettingsClose && userSettingsModal) {
        userSettingsClose.addEventListener('click', () => { userSettingsModal.style.display = 'none'; });
    }
    if (userSettingsModal) {
        userSettingsModal.addEventListener('click', (e) => {
            if (e.target === userSettingsModal) userSettingsModal.style.display = 'none';
        });
        userSettingsModal.querySelectorAll('.user-settings-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                userSettingsModal.querySelectorAll('.user-settings-tab').forEach(b => b.classList.remove('active'));
                userSettingsModal.querySelectorAll('.user-settings-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const pane = userSettingsModal.querySelector(`.user-settings-pane[data-pane="${tab}"]`);
                if (pane) pane.classList.add('active');
            });
        });
    }
    if (notifList) {
        notifList.addEventListener('click', (e) => {
            const btn = e.target.closest('.notif-remove');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            const list = loadNotifications();
            if (!Number.isNaN(idx)) list.splice(idx, 1);
            saveNotifications(list);
            renderNotifications();
        });
    }
    window.VAChat = window.VAChat || {};
    window.VAChat.notify = addNotification;
    renderNotifications();

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
            setPresenceBarVisible(false);
            setGroupSpacerVisible(false);
            showFriendSidebar();
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

    let lastRenderedDay = null;

    function ensureDateSeparator(dateValue) {
        const dayNum = toDayNumber(dateValue);
        if (dayNum == null) return;
        if (lastRenderedDay === dayNum) return;
        lastRenderedDay = dayNum;
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.textContent = formatDateLabel(dayNum);
        chatBox.appendChild(sep);
    }

    function appendMessage(data) {
        if (!chatBox) return;
        const payload = Object.assign({}, data);
        if (isDuplicate(payload)) return;
        const ts = payload.createdAt || new Date();
        ensureDateSeparator(ts);
        const div = document.createElement('div');
        div.className = 'message' + (payload.isSelf ? ' self' : '');
        if (payload.messageId || payload._id) div.dataset.messageId = String(payload.messageId || payload._id);
        const text = payload.message || payload.content || '';
        const timeLabel = formatTimeLabel(ts);
        if (!payload.isSelf) {
            const { avatar, username } = getFriendInfo(payload.from);
            const initials = (username || '').trim().slice(0, 2).toUpperCase() || '??';
            div.innerHTML = `
                <div style="display:flex;align-items:flex-end;gap:8px;">
                    ${avatar ? `<img src="${avatar}" class="avatar message-avatar">`
                        : `<div class="avatar avatar-text message-avatar">${escapeHtml(initials)}</div>`}
                    <div>
                        <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${escapeHtml(username || '')}</div>
                        <div class="message-text">${escapeHtml(String(text || ''))}</div>
                    </div>
                </div>`;
        } else {
            div.innerHTML = `<span class="message-text">${escapeHtml(String(text || ''))}</span>`;
        }
        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = timeLabel;
        div.appendChild(timeEl);
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

        if (window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type && window.VAChat.currentChat.id) {
            updateStreakBadge(window.VAChat.currentChat.type, window.VAChat.currentChat.id, window.VAChat.lastMessages);
        }

        if (payload.chat && payload.chat.type && payload.chat.id) {
            updateStreakFromMessage(payload.chat.type, payload.chat.id, ts);
        }

        // auto mark read for active friend chat
        if (!payload.isSelf && payload.chat && payload.chat.type === 'friend' && window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type === 'friend') {
            const currentId = String(window.VAChat.currentChat.id || '');
            if (String(payload.chat.id || '') === currentId) {
                if (payload.messageId || payload._id) emitFriendMarkRead(currentId, [payload.messageId || payload._id]);
            }
        }

        // update sent status for latest self message in friend chat
        if (payload.isSelf && window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type === 'friend') {
            updateSelfMessageStatusSent();
        }
    }

    function clearSelfMessageStatus() {
        if (!chatBox) return;
        chatBox.querySelectorAll('.message-status').forEach(el => el.remove());
    }

    function getLastSelfMessageEl() {
        if (!chatBox) return null;
        const selfMsgs = chatBox.querySelectorAll('.message.self');
        if (!selfMsgs || !selfMsgs.length) return null;
        return selfMsgs[selfMsgs.length - 1];
    }

    function updateSelfMessageStatusSent() {
        const cur = window.VAChat && window.VAChat.currentChat;
        if (!cur || cur.type !== 'friend') return;
        clearSelfMessageStatus();
        const last = getLastSelfMessageEl();
        if (!last) return;
        const st = document.createElement('div');
        st.className = 'message-status sent';
        st.textContent = 'Đã gửi';
        last.appendChild(st);
    }

    function updateSelfMessageStatusRead(friendId) {
        const cur = window.VAChat && window.VAChat.currentChat;
        if (!cur || cur.type !== 'friend') return;
        if (String(cur.id) !== String(friendId)) return;
        clearSelfMessageStatus();
        const last = getLastSelfMessageEl();
        if (!last) return;
        const { avatar } = getFriendInfo(friendId);
        const st = document.createElement('div');
        st.className = 'message-status read';
        if (avatar) {
            const img = document.createElement('img');
            img.src = avatar;
            img.alt = 'Seen';
            img.className = 'read-avatar';
            st.appendChild(img);
        } else {
            st.textContent = 'Đã xem';
        }
        last.appendChild(st);
    }

    function renderMessages(messages = []) {
        if (!chatBox) return;
        chatBox.innerHTML = '';
        lastRenderedDay = null;
        if (!messages.length) {
            const div = document.createElement('div');
            div.className = 'system-message';
            div.textContent = 'Bạn đã bắt đầu cuộc trò chuyện.';
            chatBox.appendChild(div);
            return;
        }
        messages.forEach(msg => {
            appendMessage({
                message: msg.content,
                from: msg.from,
                isSelf: !!msg.isSelf,
                createdAt: msg.createdAt,
                _id: msg._id,
                readBy: msg.readBy || [],
                chat: { id: (window.VAChat.currentChat && window.VAChat.currentChat.id) || '', type: (window.VAChat.currentChat && window.VAChat.currentChat.type) || 'friend' }
            });
        });
        chatBox.scrollTop = chatBox.scrollHeight;
        window.VAChat.lastMessages = (messages || []).map(m => ({ content: m.content, isSelf: !!m.isSelf, from: m.from != null ? String(m.from) : null, createdAt: m.createdAt || null })).slice(-200);
        if (window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type && window.VAChat.currentChat.id) {
            updateStreakBadge(window.VAChat.currentChat.type, window.VAChat.currentChat.id, window.VAChat.lastMessages);
        }

        // update read/sent status for friend chat
        const cur = window.VAChat && window.VAChat.currentChat;
        if (cur && cur.type === 'friend') {
            const lastSelf = (messages || []).filter(m => m.isSelf).slice(-1)[0];
            if (lastSelf) {
                const readBy = (lastSelf.readBy || []).map(String);
                if (readBy.includes(String(cur.id))) updateSelfMessageStatusRead(cur.id);
                else updateSelfMessageStatusSent();
            }
        }
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
            updateStreakBadge(chatType, chatId, window.VAChat.lastMessages || []);

            if (chatType === 'friend' && Array.isArray(data.messages)) {
                const myId = String(window.userId || '');
                const unreadIds = data.messages
                    .filter(m => !m.isSelf && (!m.readBy || !m.readBy.map(String).includes(myId)))
                    .map(m => m._id)
                    .filter(Boolean);
                emitFriendMarkRead(chatId, unreadIds);
            }
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
    const pinnedFriendSet = loadIdSet(FRIEND_PINNED_KEY);
    const mutedFriendSet = loadIdSet(FRIEND_MUTED_KEY);
    const searchBox = document.querySelector('.chat-sidebar .search-box');
    const friendListWrap = document.querySelector('.chat-sidebar .friend-list');
    const groupMembersPanel = document.getElementById('group-members-panel');
    const groupMembersList = document.getElementById('group-members');
    const presenceBar = document.getElementById('chat-presence-bar');
    const presenceName = document.getElementById('chat-presence-name');
    const presenceStatus = document.getElementById('chat-presence-status');
    const presenceDot = document.getElementById('chat-presence-dot');
    const groupSpacer = document.getElementById('chat-group-spacer');
    const presenceMap = new Map();

    function setPresenceBarVisible(visible) {
        if (!presenceBar) return;
        presenceBar.style.display = visible ? 'flex' : 'none';
    }

    function setGroupSpacerVisible(visible) {
        if (!groupSpacer) return;
        groupSpacer.style.display = visible ? 'block' : 'none';
    }

    function formatLastActive(ts) {
        if (!ts) return 'Không hoạt động gần đây';
        const time = new Date(ts);
        const diffMs = Date.now() - time.getTime();
        if (Number.isNaN(diffMs)) return 'Không hoạt động gần đây';
        const min = Math.floor(diffMs / 60000);
        const hour = Math.floor(diffMs / 3600000);
        const day = Math.floor(diffMs / 86400000);
        if (min < 1) return 'Vừa hoạt động';
        if (min < 60) return `Hoạt động ${min} phút trước`;
        if (hour < 24) return `Hoạt động ${hour} giờ trước`;
        if (day < 7) return `Hoạt động ${day} ngày trước`;
        return `Hoạt động ${time.toLocaleDateString('vi-VN')}`;
    }

    function updateFriendPresenceUI(friendId) {
        if (!friendId) return;
        const item = friendsList ? friendsList.querySelector(`.chat-item.friend-profile[data-id="${String(friendId)}"]`) : null;
        if (!item) return;
        const state = presenceMap.get(String(friendId)) || { online: false, lastActive: null };
        item.classList.toggle('online', !!state.online);
        item.classList.toggle('offline', !state.online);
        const dot = item.querySelector('.friend-presence-dot');
        if (dot) {
            dot.classList.toggle('online', !!state.online);
            dot.classList.toggle('offline', !state.online);
        }
    }

    function updatePresenceBar(friendId) {
        if (!presenceBar) return;
        if (!friendId) {
            setPresenceBarVisible(false);
            return;
        }
        setGroupSpacerVisible(false);
        const item = friendsList ? friendsList.querySelector(`.chat-item.friend-profile[data-id="${String(friendId)}"]`) : null;
        const name = item && item.querySelector('.friend-username') ? item.querySelector('.friend-username').textContent : 'Bạn bè';
        const state = presenceMap.get(String(friendId)) || { online: false, lastActive: null };
        if (presenceName) presenceName.textContent = name;
        if (presenceStatus) presenceStatus.textContent = state.online ? 'Đang hoạt động' : formatLastActive(state.lastActive);
        if (presenceDot) {
            presenceDot.classList.toggle('online', !!state.online);
            presenceDot.classList.toggle('offline', !state.online);
        }
        setPresenceBarVisible(true);
    }

    function setFriendPresence(friendId, online, lastActive) {
        if (!friendId) return;
        presenceMap.set(String(friendId), { online: !!online, lastActive: lastActive || null });
        updateFriendPresenceUI(friendId);
        if (window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type === 'friend' && String(window.VAChat.currentChat.id) === String(friendId)) {
            updatePresenceBar(friendId);
        }
    }

    function initPresenceDefaults() {
        if (!friendsList) return;
        Array.from(friendsList.querySelectorAll('.chat-item.friend-profile')).forEach(item => {
            const id = String(item.dataset.id || '');
            if (!id) return;
            if (!presenceMap.has(id)) presenceMap.set(id, { online: false, lastActive: null });
            updateFriendPresenceUI(id);
        });
    }

    function getFriendIds() {
        if (!friendsList) return [];
        return Array.from(friendsList.querySelectorAll('.chat-item.friend-profile')).map(i => String(i.dataset.id || '')).filter(Boolean);
    }

    function showFriendSidebar() {
        if (searchBox) searchBox.style.display = 'flex';
        if (friendListWrap) friendListWrap.style.display = 'block';
        if (groupMembersPanel) groupMembersPanel.style.display = 'none';
    }

    function showGroupSidebar() {
        if (searchBox) searchBox.style.display = 'none';
        if (friendListWrap) friendListWrap.style.display = 'none';
        if (groupMembersPanel) groupMembersPanel.style.display = 'block';
    }

    function renderGroupMembers(members = []) {
        if (!groupMembersList) return;
        groupMembersList.innerHTML = '';
        members.forEach(m => {
            const name = m && m.username ? String(m.username) : 'User';
            const avatar = m && m.avatar && m.avatar !== '/public/avatar.png' ? String(m.avatar) : '';
            const initials = name.trim().slice(0, 2).toUpperCase() || 'US';
            const li = document.createElement('li');
            li.className = 'group-member-item';
            li.innerHTML = `${avatar ? `<img src="${avatar}" class="avatar" style="width:28px;height:28px;">` : `<div class="avatar avatar-text" style="width:28px;height:28px;">${escapeHtml(initials)}</div>`}
                <span class="group-member-name">${escapeHtml(name)}</span>`;
            groupMembersList.appendChild(li);
        });
    }

    async function loadGroupMembers(groupId) {
        if (!groupId) return;
        try {
            const r = await fetch(`/api/groups/members?groupId=${encodeURIComponent(String(groupId))}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
            if (r.status === 401) return window.location.href = '/login';
            const j = await r.json();
            if (j && j.members) renderGroupMembers(j.members);
        } catch (e) {
            console.error(e);
        }
    }

    function applyFriendState(item) {
        if (!item) return;
        const id = String(item.dataset.id || '');
        item.classList.toggle('pinned', pinnedFriendSet.has(id));
        item.classList.toggle('muted', mutedFriendSet.has(id));
        const status = item.querySelector('.friend-status-icon');
        if (status) {
            if (pinnedFriendSet.has(id) && mutedFriendSet.has(id)) {
                status.textContent = '📌🔇';
                status.style.display = 'inline-flex';
            } else if (pinnedFriendSet.has(id)) {
                status.textContent = '📌';
                status.style.display = 'inline-flex';
            } else if (mutedFriendSet.has(id)) {
                status.textContent = '🔇';
                status.style.display = 'inline-flex';
            } else {
                status.textContent = '';
                status.style.display = 'none';
            }
        }
    }

    function sortFriends() {
        if (!friendsList) return;
        const items = Array.from(friendsList.querySelectorAll('.chat-item.friend-profile'));
        const pinnedIds = Array.from(pinnedFriendSet);
        const pinnedItems = pinnedIds.map(id => items.find(i => String(i.dataset.id) === String(id))).filter(Boolean);
        const others = items.filter(i => !pinnedFriendSet.has(String(i.dataset.id)));
        [...pinnedItems, ...others].forEach(el => friendsList.appendChild(el));
    }
    if (friendsList) {
        initPresenceDefaults();
        Array.from(friendsList.querySelectorAll('.chat-item.friend-profile')).forEach(applyFriendState);
        sortFriends();
        friendsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item.friend-profile');
            if (!item) return;
            document.querySelectorAll('.chat-item.friend-profile.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            setPrivateActive(false);
            showFriendSidebar();
            const chatId = item.dataset.id;
            window.VAChat.currentChat = { type: 'friend', id: chatId };
            persistCurrentChat();
            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'none';
            await loadMessages('friend', chatId);
            if (input) input.focus();
            const badge = item.querySelector('.unread-badge'); if (badge) badge.style.display = 'none';
            if (window.VAChat.pendingMessages) delete window.VAChat.pendingMessages[chatId];
            window.VAChat.showDeleteFor('friend', chatId);
            updatePresenceBar(chatId);
            setGroupSpacerVisible(false);
        });
    }

    if (savedChat && savedChat.type === 'friend' && savedChat.id) {
        updatePresenceBar(savedChat.id);
    }

    const groupsList = document.getElementById('groups');
    const pinnedSet = loadIdSet(GROUP_PINNED_KEY);
    const mutedSet = loadIdSet(GROUP_MUTED_KEY);
    const addMemberModal = document.getElementById('add-member-modal');
    const addMemberList = document.getElementById('add-member-list');
    const addMemberCancel = document.getElementById('add-member-cancel');
    const addMemberConfirm = document.getElementById('add-member-confirm');

    function openAddMemberModal(groupId) {
        if (!addMemberModal || !addMemberList) return;
        addMemberModal.dataset.groupId = String(groupId || '');
        addMemberList.innerHTML = '';
        document.querySelectorAll('.chat-item.friend-profile').forEach(li => {
            const id = li.dataset.id;
            const username = li.querySelector('.friend-username') ? li.querySelector('.friend-username').textContent : id;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '6px 8px';
            row.innerHTML = `<label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" data-id="${id}" /> <span style="color:#cfe7ff">${escapeHtml(username || '')}</span></label>`;
            addMemberList.appendChild(row);
        });
        addMemberModal.style.display = 'flex';
    }

    function closeAddMemberModal() {
        if (!addMemberModal) return;
        addMemberModal.style.display = 'none';
        addMemberModal.dataset.groupId = '';
    }

    if (addMemberCancel) addMemberCancel.addEventListener('click', closeAddMemberModal);
    if (addMemberConfirm) addMemberConfirm.addEventListener('click', async () => {
        if (!addMemberModal || !addMemberList) return;
        const groupId = addMemberModal.dataset.groupId;
        const selected = Array.from(addMemberList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.id).filter(Boolean);
        if (!groupId) return;
        if (!selected.length) {
            if (UI && typeof UI.alert === 'function') await UI.alert('Chọn ít nhất 1 bạn');
            else alert('Chọn ít nhất 1 bạn');
            return;
        }
        addMemberConfirm.disabled = true;
        try {
            await Promise.all(selected.map(userId => fetch('/api/groups/add-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ groupId, userId })
            })));
            if (UI && typeof UI.alert === 'function') await UI.alert('Đã thêm bạn vào nhóm');
            else alert('Đã thêm bạn vào nhóm');
            closeAddMemberModal();
            if (window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type === 'group' && String(window.VAChat.currentChat.id) === String(groupId)) {
                loadGroupMembers(groupId);
            }
        } catch (e) {
            console.error(e);
            if (UI && typeof UI.alert === 'function') await UI.alert('Lỗi thêm bạn');
            else alert('Lỗi thêm bạn');
        } finally {
            addMemberConfirm.disabled = false;
        }
    });

    function applyGroupState(item) {
        if (!item) return;
        const id = String(item.dataset.id || '');
        item.classList.toggle('pinned', pinnedSet.has(id));
        item.classList.toggle('muted', mutedSet.has(id));
        const status = item.querySelector('.group-status-icon');
        if (status) {
            if (pinnedSet.has(id) && mutedSet.has(id)) {
                status.textContent = '🔇📌';
                status.style.display = 'inline-flex';
            } else if (pinnedSet.has(id)) {
                status.textContent = '📌';
                status.style.display = 'inline-flex';
            } else if (mutedSet.has(id)) {
                status.textContent = '🔇';
                status.style.display = 'inline-flex';
            } else {
                status.textContent = '';
                status.style.display = 'none';
            }
        }
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

    applyStoredStreakBadges();
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
            setPresenceBarVisible(false);
            setGroupSpacerVisible(true);
            showGroupSidebar();
            loadGroupMembers(chatId);
        });
    }

    // Friend context menu (right click)
    const friendMenu = document.getElementById('friend-context-menu');
    const friendMenuMute = friendMenu ? friendMenu.querySelector('[data-action="toggle-mute"]') : null;
    const friendMenuPin = friendMenu ? friendMenu.querySelector('[data-action="toggle-pin"]') : null;

    function hideFriendMenu() {
        if (!friendMenu) return;
        friendMenu.style.display = 'none';
        friendMenu.dataset.friendId = '';
    }

    function openFriendMenu(item, x, y) {
        if (!friendMenu || !item) return;
        const id = String(item.dataset.id || '');
        friendMenu.dataset.friendId = id;
        if (friendMenuMute) friendMenuMute.textContent = mutedFriendSet.has(id) ? 'Bỏ im lặng' : 'Im lặng';
        if (friendMenuPin) friendMenuPin.textContent = pinnedFriendSet.has(id) ? 'Bỏ ghim 📎' : 'Ghim 📎';
        friendMenu.style.display = 'block';
        friendMenu.style.left = '0px';
        friendMenu.style.top = '0px';
        requestAnimationFrame(() => {
            const rect = friendMenu.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width - 8;
            const maxY = window.innerHeight - rect.height - 8;
            friendMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
            friendMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
        });
    }

    document.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.chat-item.friend-profile');
        if (!item) return;
        e.preventDefault();
        openFriendMenu(item, e.clientX, e.clientY);
    });

    document.addEventListener('click', (e) => {
        if (friendMenu && friendMenu.style.display === 'block') {
            if (!e.target.closest('#friend-context-menu')) hideFriendMenu();
        }
    });

    if (friendMenu) {
        friendMenu.addEventListener('click', async (e) => {
            const action = e.target && e.target.dataset ? e.target.dataset.action : '';
            if (!action) return;
            const friendId = friendMenu.dataset.friendId;
            if (!friendId) return;

            const item = friendsList ? friendsList.querySelector(`.chat-item.friend-profile[data-id="${friendId}"]`) : null;

            if (action === 'mark-read') {
                if (item) {
                    const badge = item.querySelector('.unread-badge');
                    if (badge) badge.style.display = 'none';
                }
                hideFriendMenu();
                return;
            }

            if (action === 'toggle-mute') {
                if (mutedFriendSet.has(friendId)) mutedFriendSet.delete(friendId); else mutedFriendSet.add(friendId);
                saveIdSet(FRIEND_MUTED_KEY, mutedFriendSet);
                applyFriendState(item);
                if (friendMenuMute) friendMenuMute.textContent = mutedFriendSet.has(friendId) ? 'Bỏ im lặng' : 'Im lặng';
                hideFriendMenu();
                return;
            }

            if (action === 'toggle-pin') {
                if (pinnedFriendSet.has(friendId)) pinnedFriendSet.delete(friendId); else pinnedFriendSet.add(friendId);
                saveIdSet(FRIEND_PINNED_KEY, pinnedFriendSet);
                applyFriendState(item);
                sortFriends();
                if (friendMenuPin) friendMenuPin.textContent = pinnedFriendSet.has(friendId) ? 'Bỏ ghim 📎' : 'Ghim 📎';
                hideFriendMenu();
                return;
            }

            if (action === 'delete-convo') {
                const ok = window.UI && window.UI.confirm ? await window.UI.confirm('Xóa cuộc trò chuyện sẽ xóa toàn bộ tin nhắn. Bạn chắc chắn?') : confirm('Xóa cuộc trò chuyện sẽ xóa toàn bộ tin nhắn. Bạn chắc chắn?');
                if (!ok) return;
                try {
                    const r = await fetch('/api/messages/delete-conversation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ chatType: 'friend', chatId: friendId })
                    });
                    if (r.status === 401) return window.location.href = '/login';
                    const j = await r.json();
                    if (j && j.success) {
                        if (window.VAChat && window.VAChat.currentChat && window.VAChat.currentChat.type === 'friend' && String(window.VAChat.currentChat.id) === String(friendId)) {
                            window.VAChat.currentChat = null;
                            persistCurrentChat();
                            const chatBox = document.getElementById('chat-box'); if (chatBox) chatBox.innerHTML = '<div class="system-message">Bạn đã xóa cuộc trò chuyện này.</div>';
                            const dd = getDeleteBtn(); if (dd) dd.style.display = 'none';
                        }
                    } else {
                        if (window.UI && window.UI.alert) await window.UI.alert(j && j.error ? j.error : 'Xóa thất bại'); else alert(j && j.error ? j.error : 'Xóa thất bại');
                    }
                } catch (err) {
                    console.error(err);
                    if (window.UI && window.UI.alert) await window.UI.alert('Lỗi khi xóa cuộc trò chuyện'); else alert('Lỗi khi xóa cuộc trò chuyện');
                } finally {
                    hideFriendMenu();
                }
                return;
            }

            if (action === 'remove-friend') {
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
                        if (item) item.remove();
                        pinnedFriendSet.delete(friendId);
                        mutedFriendSet.delete(friendId);
                        saveIdSet(FRIEND_PINNED_KEY, pinnedFriendSet);
                        saveIdSet(FRIEND_MUTED_KEY, mutedFriendSet);
                    } else {
                        if (window.UI && window.UI.alert) await window.UI.alert(jr && jr.error ? jr.error : 'Lỗi xóa bạn'); else alert(jr && jr.error ? jr.error : 'Lỗi xóa bạn');
                    }
                } catch (err) {
                    console.error(err);
                    if (window.UI && window.UI.alert) await window.UI.alert('Lỗi xóa bạn'); else alert('Lỗi xóa bạn');
                } finally {
                    hideFriendMenu();
                }
                return;
            }
        });
    }

    // Friend read receipt
    if (socket && socket.on) {
        socket.on('friend-read-receipt', (payload) => {
            if (!payload || !payload.chatId) return;
            updateSelfMessageStatusRead(payload.chatId);
        });
        socket.on('friend-online', (payload) => {
            if (!payload || !payload.userId) return;
            setFriendPresence(payload.userId, true, payload.lastActive || null);
        });
        socket.on('friend-offline', (payload) => {
            if (!payload || !payload.userId) return;
            setFriendPresence(payload.userId, false, payload.lastActive || null);
        });
        socket.on('presence:state', (list) => {
            if (!Array.isArray(list)) return;
            list.forEach(s => setFriendPresence(s.userId, !!s.online, s.lastActive || null));
        });
        const syncPresence = () => {
            const ids = getFriendIds();
            if (ids.length && socket && socket.emit) socket.emit('presence:sync', ids);
        };
        socket.on('connect', syncPresence);
        socket.on('registered', syncPresence);
        if (socket.connected) syncPresence();
    }

    // Group context menu (right click)
    const groupMenu = document.getElementById('group-context-menu');
    const groupMenuMute = groupMenu ? groupMenu.querySelector('[data-action="toggle-mute"]') : null;
    const groupMenuPin = groupMenu ? groupMenu.querySelector('[data-action="toggle-pin"]') : null;
    const groupMenuRead = groupMenu ? groupMenu.querySelector('[data-action="mark-read"]') : null;
    const groupMenuAdd = groupMenu ? groupMenu.querySelector('[data-action="add-member"]') : null;
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
        if (groupMenuAdd) groupMenuAdd.textContent = 'Thêm bạn bè vào nhóm';
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

            if (action === 'add-member') {
                hideGroupMenu();
                openAddMemberModal(groupId);
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
                if (!socket || !socket.emit) throw new Error('Socket not ready');
                socket.emit('message:send', { chatType, chatId, message: text }, async (ack) => {
                    if (ack && ack.success) {
                        input.value = '';
                    } else {
                        const errMsg = ack && ack.error ? ack.error : 'Không gửi được tin nhắn';
                        if (UI && typeof UI.alert === 'function') await UI.alert(errMsg);
                        else alert(errMsg);
                    }
                });
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
                        if (chatType === 'group') {
                            badge.className = 'unread-badge group-unread-badge';
                        } else {
                            badge.className = 'friend-request-badge unread-badge';
                            badge.style.position = 'absolute';
                            badge.style.right = '12px';
                            badge.style.top = '10px';
                        }
                        badge.textContent = '1';
                        item.appendChild(badge);
                    } else {
                        const cur = parseInt(badge.textContent || '0', 10);
                        badge.textContent = String(cur + 1);
                        badge.style.display = 'inline-block';
                    }
                }
                if (!data.isSelf && window.VAChat && typeof window.VAChat.notify === 'function') {
                    if (chatType === 'friend') {
                        const { username } = getFriendInfo(data.from);
                        window.VAChat.notify(`Bạn có tin nhắn mới từ ${username || 'bạn bè'}`);
                    } else {
                        const gName = item && item.dataset ? item.dataset.groupName : '';
                        window.VAChat.notify(`Tin nhắn mới trong nhóm ${gName || 'Group'}`);
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
