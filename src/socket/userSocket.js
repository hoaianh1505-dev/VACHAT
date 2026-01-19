module.exports = (io, socket) => {
    // diagnostics
    socket.on('ping', (payload) => { socket.emit('pong', payload || {}); });
    socket.on('whoami', () => { socket.emit('whoami', { userId: socket.userId || null }); });

    // allow explicit re-register (client may call this)
    socket.on('register-user', (userId) => {
        if (!userId) return;
        const uid = String(userId);
        socket.userId = uid;
        try {
            io.userSockets = io.userSockets || {};
            io.socketUser = io.socketUser || {};
            io.userSockets[uid] = io.userSockets[uid] || new Set();
            io.userSockets[uid].add(socket.id);
            io.socketUser[socket.id] = uid;
            try { socket.emit('user-registered', { userId: uid }); } catch (e) { }
        } catch (e) { /* noop */ }
    });
};
