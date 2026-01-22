import UI from './ui.mjs';

// Chat Module
export function initMessages({ socket } = {}) {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('send-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');

    function getDeleteBtn() { return document.getElementById('delete-convo-btn'); }
    const EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🔥', '🙏', '😢', '😎', '🤔', '😅', '👏', '💯', '🎁', '🥳'];

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

    window.AVChat = window.AVChat || {};
    if (!window.AVChat._recentMsgKeys) window.AVChat._recentMsgKeys = new Map();
    function makeMsgKey(obj) {
        try {
            const chatId = (obj.chat && obj.chat.id) || (window.AVChat.currentChat && window.AVChat.currentChat.id) || '';
            const from = String(obj.from || '');
            const text = String(obj.message || obj.content || '').slice(0, 140);
            const ts = obj.createdAt ? String(new Date(obj.createdAt).getTime()) : '';
            return `${chatId}::${from}::${text}::${ts}`;
        } catch (e) { return Math.random().toString(36).slice(2); }
    }
    function isDuplicate(obj, windowMs = 2000) {
        const k = makeMsgKey(obj);
        const now = Date.now();
        const prev = window.AVChat._recentMsgKeys.get(k);
        if (prev && (now - prev) < windowMs) return true;
        window.AVChat._recentMsgKeys.set(k, now);
        setTimeout(() => { window.AVChat._recentMsgKeys.delete(k); }, 30000);
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

        window.AVChat.lastMessages = window.AVChat.lastMessages || [];
        window.AVChat.lastMessages.push({
            content: text,
            isSelf: !!payload.isSelf,
            from: payload.from != null ? String(payload.from) : null,
            createdAt: payload.createdAt || new Date()
        });
        if (window.AVChat.lastMessages.length > 200) window.AVChat.lastMessages = window.AVChat.lastMessages.slice(-200);
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
            appendMessage({ message: msg.content, from: msg.from, isSelf: !!msg.isSelf, createdAt: msg.createdAt, chat: { id: (window.AVChat.currentChat && window.AVChat.currentChat.id) || '' } });
        });
        chatBox.scrollTop = chatBox.scrollHeight;
        window.AVChat.lastMessages = (messages || []).map(m => ({ content: m.content, isSelf: !!m.isSelf, from: m.from != null ? String(m.from) : null, createdAt: m.createdAt || null })).slice(-200);
    }

    function setSendEnabled(enabled) {
        if (sendBtn) sendBtn.disabled = !enabled;
        if (input) input.disabled = !enabled;
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
            const dd = getDeleteBtn();
            if (dd) { dd.style.display = 'none'; dd.dataset.chatId = ''; dd.dataset.chatType = ''; }
            return;
        }
        setSendEnabled(false);
        showLoading();
        try {
            const res = await fetch(`/api/messages?chatType=${encodeURIComponent(chatType)}&chatId=${encodeURIComponent(chatId)}`, { method: 'GET', credentials: 'same-origin' });
            if (res.status === 401) return window.location.href = '/login';
            const data = await res.json();
            hideLoading();
            renderMessages(data.messages || []);
            window.AVChat = window.AVChat || {};
            window.AVChat.lastMessages = data.messages || [];
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
            if (window.AVChat && window.AVChat.currentChat) {
                localStorage.setItem('avchat.lastChat', JSON.stringify(window.AVChat.currentChat));
            } else {
                localStorage.removeItem('avchat.lastChat');
            }
        } catch (e) { /* noop */ }
    }
    window.addEventListener('beforeunload', persistCurrentChat);

    try {
        const saved = localStorage.getItem('avchat.lastChat');
        if (saved) {
            const last = JSON.parse(saved);
            if (last && last.type && last.id) {
                const sel = last.type === 'friend' ? `.chat-item.friend-profile[data-id="${String(last.id)}"]` : `.chat-item[data-type="group"][data-id="${String(last.id)}"]`;
                const el = document.querySelector(sel);
                if (el) {
                    document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
                    el.classList.add('active');
                }
                window.AVChat.currentChat = { type: last.type, id: last.id };
                setTimeout(() => { loadMessages(last.type, last.id).catch(() => { }); }, 120);
            }
        }
    } catch (e) { /* noop */ }

    window.AVChat = window.AVChat || {};
    window.AVChat.loadMessages = loadMessages;
    window.AVChat.currentChat = window.AVChat.currentChat || null;
    window.AVChat.showDeleteFor = (t, id) => { const dd = getDeleteBtn(); if (!dd) return; dd.dataset.chatType = t; dd.dataset.chatId = id; dd.style.display = 'inline-flex'; };

    const friendsList = document.getElementById('friends');
    if (friendsList) {
        friendsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item.friend-profile');
            if (!item) return;
            document.querySelectorAll('.chat-item.friend-profile.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const chatId = item.dataset.id;
            window.AVChat.currentChat = { type: 'friend', id: chatId };
            persistCurrentChat();
            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'none';
            await loadMessages('friend', chatId);
            if (input) input.focus();
            const badge = item.querySelector('.unread-badge'); if (badge) badge.style.display = 'none';
            if (window.AVChat.pendingMessages) delete window.AVChat.pendingMessages[chatId];
            window.AVChat.showDeleteFor('friend', chatId);
        });
    }

    const groupsList = document.getElementById('groups');
    if (groupsList) {
        groupsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item[data-type="group"]');
            if (!item) return;
            document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const chatId = item.dataset.id;
            window.AVChat.currentChat = { type: 'group', id: chatId };
            persistCurrentChat();
            const placeholder = document.getElementById('chat-placeholder'); if (placeholder) placeholder.style.display = 'none';
            await loadMessages('group', chatId);
            if (input) input.focus();
            window.AVChat.showDeleteFor('group', chatId);
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
            const chatType = active.dataset.type || (window.AVChat.currentChat && window.AVChat.currentChat.type) || 'friend';
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
                const cur = window.AVChat && window.AVChat.currentChat;
                if (cur && String(cur.type) === String(data.chatType) && String(cur.id) === String(data.chatId)) {
                    window.AVChat.currentChat = null;
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
