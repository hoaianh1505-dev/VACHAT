module.exports = (io, socket) => {
    // simple ping/pong for diagnostics
    socket.on('ping', (payload) => {
        socket.emit('pong', payload || {});
    });
    // whoami helper
    socket.on('whoami', () => {
        socket.emit('whoami', { userId: socket.userId || null });
    });
    // allow explicit re-register (safe)
    socket.on('register-user', (userId) => {
        if (!userId) return;
        socket.userId = String(userId);
        // register into io maps if socketHandlers not already handled it
        try {
            if (io.userSockets && io.socketUser) {
                io.userSockets[socket.userId] = io.userSockets[socket.userId] || new Set();
                io.userSockets[socket.userId].add(socket.id);
                io.socketUser[socket.id] = socket.userId;
            }
        } catch (e) { /* noop */ }
    });
};
