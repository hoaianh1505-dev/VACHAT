module.exports = (io, socket) => {
    const messageService = require('../services/messageService');
    const { ensureCanSend } = require('../services/messageGuard');
    const { sanitizeText } = require('../utils/sanitizer');

    // Client may emit 'message:send' - we persist + emit to participants
    // payload: { chatType, chatId, message }
    socket.on('message:send', async (payload, ack) => {
        try {
            if (!socket.userId) return typeof ack === 'function' ? ack({ success: false, error: 'Not registered' }) : null;
            if (!payload || !payload.chatType || !payload.chatId || !payload.message) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Missing fields' });
                return;
            }

            const chatType = String(payload.chatType);
            const chatId = String(payload.chatId);
            const text = sanitizeText(payload.message);
            if (!text) return typeof ack === 'function' ? ack({ success: false, error: 'Empty message' }) : null;

            // rate-limit
            if (typeof socket.canSend === 'function' && !socket.canSend(1)) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Rate limit' });
                return;
            }

            // ACL: delegate to guard module (throws on failure)
            try {
                await ensureCanSend(String(socket.userId), chatType, chatId);
            } catch (aclErr) {
                if (typeof ack === 'function') return ack({ success: false, error: aclErr.message });
                return;
            }

            // persist and emit via messageService
            const msg = await messageService.createMessage({
                chatType,
                chatId,
                fromId: String(socket.userId),
                toId: chatType === 'friend' ? chatId : undefined,
                content: text,
                io
            });

            if (typeof ack === 'function') ack({ success: true, id: String(msg._id), createdAt: msg.createdAt });
        } catch (e) {
            console.warn('message:send error', e);
            if (typeof ack === 'function') ack({ success: false, error: e && e.message ? e.message : 'Send failed' });
        }
    });

    // legacy passive receiver (no-op)
    socket.on('chat message', (msg) => { /* noop - kept for compatibility */ });
};
