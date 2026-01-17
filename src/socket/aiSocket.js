const aiService = require('../services/aiService');

module.exports = (io, socket) => {
    socket.on('ai-query', async (data) => {
        try {
            const userId = socket.userId || null;
            const resp = await aiService.getResponse(data.prompt || '', { userId });
            socket.emit('ai-response', { requestId: data.requestId, result: resp });
        } catch (e) {
            socket.emit('ai-response', { requestId: data.requestId, error: e.message });
        }
    });

    socket.on('ai-reply', async (data) => {
        const requestId = data && data.requestId;
        try {
            const userId = socket.userId;
            if (!userId) return socket.emit('ai-reply-response', { requestId, error: 'Unauthorized' });

            const { chatType, chatId } = data || {};
            if (!chatType || !chatId) return socket.emit('ai-reply-response', { requestId, error: 'Missing chat info' });

            const messageService = require('../services/messageService');
            const msgs = await messageService.getMessages({ userId, chatType, chatId });
            const lastOther = [...msgs].reverse().find(m => !m.isSelf);
            if (!lastOther) return socket.emit('ai-reply-response', { requestId, error: 'No incoming message to reply to' });

            const prompt = String(lastOther.content || '').slice(0, 1000);
            const reply = await aiService.getResponse(prompt, { userId });

            const created = await messageService.createMessage({
                chatType,
                chatId,
                fromId: userId,
                toId: chatId,
                content: reply,
                io
            });

            socket.emit('ai-reply-response', { requestId, success: true, message: { id: String(created._id), text: reply } });
        } catch (e) {
            socket.emit('ai-reply-response', { requestId, error: e.message || 'AI reply failed' });
        }
    });
};
