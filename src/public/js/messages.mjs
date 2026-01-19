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

    function setLastRead(friendId, count) { localStorage.setItem(`chat_last_read_${friendId}`, String(count || 0)); }
    function getLastRead(friendId) { return parseInt(localStorage.getItem(`chat_last_read_${friendId}`) || '0', 10); }

    function appendMessage(data) {
        if (!chatBox) return;
        const div = document.createElement('div');
        div.className = 'message' + (data.isSelf ? ' self' : '');
        if (!data.isSelf) {
            const { avatar, username } = getFriendInfo(data.from);
            div.innerHTML = `
                <div style="display:flex;align-items:flex-end;gap:8px;">
                    <img src="${avatar || '/public/avatar.png'}" class="avatar" style="width:28px;height:28px;">
                    <div>
                        <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${username || ''}</div>
                        <div>${escapeHtml(String(data.message || ''))}</div>
                    </div>
                </div>`;
        } else {
            div.textContent = data.message;
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;

        window.AVChat = window.AVChat || {};
        window.AVChat.lastMessages = window.AVChat.lastMessages || [];
        try {
            window.AVChat.lastMessages.push({
                content: data.message,
                isSelf: !!data.isSelf,
                from: data.from != null ? String(data.from) : (data.isSelf ? String(window.userId) : null),
                createdAt: data.createdAt || new Date()
            });
            const MAX_STORE = 200;
            if (window.AVChat.lastMessages.length > MAX_STORE) window.AVChat.lastMessages = window.AVChat.lastMessages.slice(-MAX_STORE);
        } catch (e) { /* noop */ }
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
            const div = document.createElement('div');
            div.className = 'message' + (msg.isSelf ? ' self' : '');
            if (!msg.isSelf) {
                const { avatar, username } = getFriendInfo(String(msg.from));
                div.innerHTML = `
                    <div style="display:flex;align-items:flex-end;gap:8px;">
                        <img src="${avatar || '/public/avatar.png'}" class="avatar" style="width:28px;height:28px;">
                        <div>
                            <div style="font-size:0.95rem;color:#7abfff;font-weight:600;margin-bottom:2px;">${username || ''}</div>
                            <div>${escapeHtml(String(msg.content || ''))}</div>
                        </div>
                    </div>`;
            } else {
                div.textContent = msg.content;
            }
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;

        window.AVChat = window.AVChat || {};
        window.AVChat.lastMessages = (messages || []).map(m => ({
            content: m.content,
            isSelf: !!m.isSelf,
            from: m.from != null ? String(m.from) : null,
            createdAt: m.createdAt || null
        })).slice(-200);
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
    function hideLoading() {
        const el = document.getElementById('messages-loading');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // hide delete by default
    const deleteBtn = getDeleteBtn();
    if (deleteBtn) { deleteBtn.style.display = 'none'; deleteBtn.dataset.chatId = ''; deleteBtn.dataset.chatType = ''; }

    async function loadMessages(chatType, chatId) {
        if (!chatType || !chatId) {
            setSendEnabled(false);
            const dbtn = getDeleteBtn();
            if (dbtn) { dbtn.style.display = 'none'; dbtn.dataset.chatId = ''; dbtn.dataset.chatType = ''; }
            return;
        }
        setSendEnabled(false);
        showLoading();
        try {
            const res = await fetch(`/messages?chatType=${encodeURIComponent(chatType)}&chatId=${encodeURIComponent(chatId)}`, { method: 'GET', credentials: 'same-origin' });
            if (res.status === 401) return window.location.href = '/login';
            const data = await res.json();
            hideLoading();
            renderMessages(data.messages || []);
            window.AVChat = window.AVChat || {};
            window.AVChat.lastMessages = data.messages || [];
            setLastRead(chatId, String((data.messages || []).length));
            setSendEnabled(true);
            if (input) input.focus();

            // ensure delete button shown for this chat (use getter)
            const dbtn = getDeleteBtn();
            if (dbtn) { dbtn.style.display = 'block'; dbtn.dataset.chatId = chatId; dbtn.dataset.chatType = chatType; }

            // NEW: notify other scripts/UI that conversation opened
            try {
                window.dispatchEvent(new CustomEvent('conversation-opened', { detail: { chatType, chatId } }));
            } catch (e) { /* noop for older browsers */ }
        } catch (err) {
            console.error('loadMessages error', err);
            hideLoading();
            setSendEnabled(true);
        }
    }

    // expose loader
    window.AVChat = window.AVChat || {};
    window.AVChat.loadMessages = loadMessages;
    window.AVChat.currentChat = window.AVChat.currentChat || null;

    // expose showDeleteFor so other scripts can request the delete button to appear
    function showDeleteFor(chatType, chatId) {
        const dbtn = getDeleteBtn();
        if (!dbtn) return;
        dbtn.dataset.chatType = String(chatType || '');
        dbtn.dataset.chatId = String(chatId || '');
        dbtn.style.display = 'inline-flex';
    }
    window.AVChat.showDeleteFor = showDeleteFor;

    // friends list click (delegation)
    const friendsList = document.getElementById('friends');
    if (friendsList) {
        friendsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item.friend-profile');
            if (!item) return;
            document.querySelectorAll('.chat-item.friend-profile.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const chatId = item.dataset.id;
            window.AVChat.currentChat = { type: 'friend', id: chatId };

            const placeholder = document.getElementById('chat-placeholder');
            if (placeholder) placeholder.style.display = 'none';

            await loadMessages('friend', chatId);

            const badge = item.querySelector('.unread-badge');
            if (badge) badge.style.display = 'none';

            if (window.AVChat.pendingMessages) delete window.AVChat.pendingMessages[chatId];

            // also ensure delete button visible even if other script triggered selection
            showDeleteFor('friend', chatId);
        });
    }

    // send handler
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const active = document.querySelector('.chat-item.friend-profile.active');
            if (!active) {
                if (window.UI && typeof window.UI.alert === 'function') await window.UI.alert('Chọn bạn để gửi tin nhắn');
                else alert('Chọn bạn để gửi tin nhắn');
                return;
            }
            const chatId = active.dataset.id;
            const chatType = active.dataset.type || 'friend';
            const text = input.value && input.value.trim();
            if (!text) return;
            if (sendBtn) sendBtn.disabled = true;
            try {
                const resp = await fetch('/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ chatType, chatId, message: text })
                });
                if (resp.status === 401) return window.location.href = '/login';
                const result = await resp.json();
                if (result.success) {
                    input.value = '';
                } else {
                    if (window.UI && typeof window.UI.alert === 'function') await window.UI.alert(result.error || 'Không gửi được tin nhắn');
                    else alert(result.error || 'Không gửi được tin nhắn');
                }
            } catch (err) {
                console.error('send error', err);
                if (window.UI && typeof window.UI.alert === 'function') await window.UI.alert('Lỗi gửi tin nhắn');
                else alert('Lỗi gửi tin nhắn');
            } finally {
                if (sendBtn) sendBtn.disabled = false;
            }
        });
    }

    // realtime incoming
    if (socket) {
        socket.on('chat message', (data) => {
            const active = document.querySelector('.chat-item.friend-profile.active');
            const activeId = active ? String(active.dataset.id) : null;
            const fromId = String(data.from);
            const chatMsgId = String(data.chat && data.chat.id);

            if (activeId && ((data.isSelf && chatMsgId === activeId) || (!data.isSelf && fromId === activeId))) {
                appendMessage({ isSelf: data.isSelf, from: data.from, message: data.message, createdAt: data.createdAt });
                const count = chatBox.children.length;
                setLastRead(activeId, count);
            } else {
                const friendId = data.isSelf ? chatMsgId : fromId;
                const item = document.querySelector(`.chat-item.friend-profile[data-id="${friendId}"]`);
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
                    if (sendBtn) sendBtn.disabled = false;
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

    // AI suggestion modal (uses fetch /api/ai/suggest)
    async function requestAISuggestion() {
        const active = document.querySelector('.chat-item.friend-profile.active');
        if (!active) {
            if (window.UI && typeof window.UI.alert === 'function') await window.UI.alert('Chọn bạn để lấy gợi ý AI');
            else alert('Chọn bạn để lấy gợi ý AI');
            return;
        }
        const msgs = window.AVChat && window.AVChat.lastMessages ? window.AVChat.lastMessages : [];
        const lastOther = [...msgs].reverse().find(m => !m.isSelf);
        if (!lastOther || !lastOther.content) {
            if (window.UI && typeof window.UI.alert === 'function') await window.UI.alert('Không có tin nhắn của đối phương để gợi ý.');
            else alert('Không có tin nhắn của đối phương để gợi ý.');
            return;
        }
        const lastText = String(lastOther.content).trim();
        const chatId = active.dataset.id;
        const chatType = active.dataset.type || 'friend';

        const overlay = document.createElement('div');
        overlay.className = 'friend-request-popup';
        overlay.innerHTML = `<div class="friend-request-modal" style="min-width:320px;">
            <div style="font-weight:700;color:#4f8cff;margin-bottom:10px;">AI gợi ý (1 câu)</div>
            <div id="ai-suggestion-text" style="white-space:pre-wrap;background:#0d1114;padding:12px;border-radius:8px;color:#e6eef8;min-height:48px;">Đang tạo gợi ý...</div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
                <button class="btn" id="ai-insert-btn" disabled>Chèn</button>
                <button class="btn" id="ai-close-btn" style="background:#ef4444;">Đóng</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        const textEl = overlay.querySelector('#ai-suggestion-text');
        const insertBtn = overlay.querySelector('#ai-insert-btn');
        const closeBtn = overlay.querySelector('#ai-close-btn');
        closeBtn.onclick = () => overlay.remove();
        insertBtn.onclick = () => {
            if (input) input.value = textEl.textContent || '';
            overlay.remove();
            if (input) input.focus();
        };

        const aiBtn = document.getElementById('ai-btn');
        if (aiBtn) aiBtn.disabled = true;
        try {
            const r = await fetch('/api/ai/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ prompt: lastText })
            });
            const j = await r.json();
            if (j && j.success && j.result) {
                textEl.textContent = j.result;
                insertBtn.disabled = false;
            } else {
                textEl.textContent = j && j.error ? j.error : 'AI không trả về gợi ý.';
            }
        } catch (e) {
            console.error('AI request failed', e);
            textEl.textContent = 'Lỗi kết nối AI.';
        } finally {
            if (aiBtn) aiBtn.disabled = false;
        }
    }

    if (typeof document !== 'undefined') {
        const aiBtn = document.getElementById('ai-btn');
        if (aiBtn) aiBtn.addEventListener('click', (e) => { e.stopPropagation(); requestAISuggestion(); });
    }

    // utility: simple HTML escape
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
}
