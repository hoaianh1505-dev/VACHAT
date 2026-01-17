export function initMessages({ socket } = {}) {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('send-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');

    // small emoji set; bạn có thể mở rộng
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

    // last-read helpers
    function setLastRead(friendId, count) {
        const key = `chat_last_read_${friendId}`;
        localStorage.setItem(key, String(count || 0));
    }
    function getLastRead(friendId) {
        const key = `chat_last_read_${friendId}`;
        return parseInt(localStorage.getItem(key) || '0', 10);
    }

    // NEW: append single message (avoid full reload)
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
						<div>${data.message}</div>
					</div>
				</div>
			`;
        } else {
            div.textContent = data.message;
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;

        // NEW: update in-memory lastMessages for current chat so AI uses latest incoming message
        window.AVChat = window.AVChat || {};
        window.AVChat.lastMessages = window.AVChat.lastMessages || [];
        try {
            const msgObj = {
                content: data.message,
                isSelf: !!data.isSelf,
                from: data.from != null ? String(data.from) : (data.isSelf ? String(window.userId) : null),
                createdAt: data.createdAt || new Date()
            };
            // push and trim to keep only recent messages
            window.AVChat.lastMessages.push(msgObj);
            const MAX_STORE = 200;
            if (window.AVChat.lastMessages.length > MAX_STORE) {
                window.AVChat.lastMessages = window.AVChat.lastMessages.slice(-MAX_STORE);
            }
        } catch (e) {
            // noop
        }
    }

    // render messages
    function renderMessages(messages, currentChatId) {
        chatBox.innerHTML = '';
        if (!messages || !messages.length) {
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
							<div>${msg.content}</div>
						</div>
					</div>`;
            } else {
                div.textContent = msg.content;
            }
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;

        // NEW: reflect loaded messages in lastMessages for AI use (normalized shape)
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

    // load history
    async function loadMessages(chatType, chatId) {
        if (!chatType || !chatId) {
            setSendEnabled(false);
            return;
        }
        setSendEnabled(false);
        showLoading();
        try {
            const res = await fetch(`/messages?chatType=${encodeURIComponent(chatType)}&chatId=${encodeURIComponent(chatId)}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
            if (res.status === 401) return window.location.href = '/login';
            const data = await res.json();
            hideLoading();
            renderMessages(data.messages || [], chatId);
            // store last messages for AI suggestion / other logic
            window.AVChat.lastMessages = data.messages || [];
            setLastRead(chatId, String((data.messages || []).length));
            setSendEnabled(true);
            if (input) input.focus();
        } catch (err) {
            console.error('loadMessages error', err);
            hideLoading();
            setSendEnabled(true);
        }
    }

    // expose for external uses
    window.AVChat = window.AVChat || {};
    window.AVChat.loadMessages = loadMessages;

    // currentChat state
    window.AVChat.currentChat = window.AVChat.currentChat || null;

    // Click handler: delegation on friends list
    const friendsList = document.getElementById('friends');
    if (friendsList) {
        friendsList.addEventListener('click', async (e) => {
            const item = e.target.closest('.chat-item.friend-profile');
            if (!item) return;
            // mark active
            document.querySelectorAll('.chat-item.friend-profile.active').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const chatId = item.dataset.id;
            window.AVChat.currentChat = { type: 'friend', id: chatId };

            // hide placeholder
            const placeholder = document.getElementById('chat-placeholder');
            if (placeholder) placeholder.style.display = 'none';

            // load messages
            await loadMessages('friend', chatId);

            // reset unread badge
            const badge = item.querySelector('.unread-badge');
            if (badge) badge.style.display = 'none';

            // update lastRead (already set in loadMessages)
            // ensure pendingMessages removed if present
            if (window.AVChat.pendingMessages) delete window.AVChat.pendingMessages[chatId];
        });
    }

    // send handler: DO NOT emit socket or reload; rely on server emit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const active = document.querySelector('.chat-item.friend-profile.active');
            if (!active) return alert('Chọn bạn để gửi tin nhắn');
            const chatId = active.dataset.id;
            const chatType = active.dataset.type || 'friend';
            const text = input.value && input.value.trim();
            if (!text) return;
            // disable send to prevent double clicks
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
                    // clear input and wait for server realtime emit to append (avoid reload)
                    input.value = '';
                    // optionally optimistic append could be added here with a pending flag
                } else {
                    alert(result.error || 'Không gửi được tin nhắn');
                }
            } catch (err) {
                console.error('send error', err);
                alert('Lỗi gửi tin nhắn');
            } finally {
                if (sendBtn) sendBtn.disabled = false;
            }
        });
    }

    // realtime incoming: append single message instead of reloading
    if (socket) {
        socket.on('chat message', (data) => {
            const active = document.querySelector('.chat-item.friend-profile.active');
            const activeId = active ? String(active.dataset.id) : null;
            const fromId = String(data.from);
            const chatMsgId = String(data.chat && data.chat.id);

            if (activeId && ((data.isSelf && chatMsgId === activeId) || (!data.isSelf && fromId === activeId))) {
                // append single message to avoid re-render flicker
                appendMessage({ isSelf: data.isSelf, from: data.from, message: data.message, createdAt: data.createdAt });
                // update last read count
                const count = chatBox.children.length;
                setLastRead(activeId, count);
            } else {
                // update badge (unchanged)
                const friendId = data.isSelf ? chatMsgId : fromId;
                const item = document.querySelector(`.chat-item.friend-profile[data-id="${friendId}"]`);
                if (item) {
                    const badge = item.querySelector('.unread-badge');
                    if (badge) {
                        badge.style.display = 'inline-block';
                        const currentCount = parseInt(badge.textContent || '0', 10);
                        badge.textContent = String(currentCount + 1);
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
                // insert emoji at caret / append
                if (input) {
                    const start = input.selectionStart || input.value.length;
                    const end = input.selectionEnd || input.value.length;
                    const v = input.value;
                    input.value = v.slice(0, start) + e + v.slice(end);
                    const pos = start + e.length;
                    input.setSelectionRange(pos, pos);
                    input.focus();
                    // enable send button if was disabled
                    if (sendBtn) sendBtn.disabled = false;
                }
                // keep picker open for multiple picks
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

    // close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiPicker || !emojiBtn) return;
        if (emojiPicker.style.display === 'none') return;
        if (e.target === emojiBtn || emojiBtn.contains(e.target)) return;
        if (emojiPicker.contains(e.target)) return;
        emojiPicker.style.display = 'none';
    });

    if (emojiBtn) {
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleEmojiPicker();
        });
    }

    // AI suggestion: request server AI and show small modal
    async function requestAISuggestion() {
        const active = document.querySelector('.chat-item.friend-profile.active');
        if (!active) return alert('Chọn bạn để lấy gợi ý AI');
        // get last received message (from other side)
        const msgs = window.AVChat && window.AVChat.lastMessages ? window.AVChat.lastMessages : [];
        const lastOther = [...msgs].reverse().find(m => !m.isSelf);
        if (!lastOther || !lastOther.content) return alert('Không có tin nhắn của đối phương để gợi ý.');

        const lastText = String(lastOther.content).trim();
        const chatId = active.dataset.id;
        const chatType = active.dataset.type || 'friend';

        // UI modal
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
            // Public suggest: send only the last incoming message as prompt (no auth required)
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

    // wire up AI button
    if (typeof document !== 'undefined') {
        const aiBtn = document.getElementById('ai-btn');
        if (aiBtn) aiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            requestAISuggestion();
        });
    }
}
