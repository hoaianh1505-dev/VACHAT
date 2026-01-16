module.exports = (io, socket) => {
    socket.on('chat message', (msg) => {
        if (!msg || !msg.chat) return;
        if (msg.chat.type === 'friend') {
            const fromId = socket.userId;
            const toId = String(msg.chat.id);
            const payload = {
                chat: msg.chat,
                message: msg.message,
                from: fromId,
                to: toId,
                createdAt: msg.createdAt || new Date()
            };
            // immediate UX: send to sender and recipient (if online)
            try {
                if (fromId) io.emitToUser(fromId, 'chat message', Object.assign({}, payload, { isSelf: true }));
                if (toId) io.emitToUser(toId, 'chat message', Object.assign({}, payload, { isSelf: false }));
            } catch (e) {
                console.warn('messageSocket emit failed', e);
            }
        }
        // groups can be handled in groupSocket
    });
};
