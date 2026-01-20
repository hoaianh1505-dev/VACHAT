module.exports = (io, socket) => {
    // diagnostics
    socket.on('ping', (payload) => { socket.emit('pong', payload || {}); });
    socket.on('whoami', () => { socket.emit('whoami', { userId: socket.userId || null }); });

    // allow explicit re-register (client may call this)
    socket.on('register-user', (userId) => {
        if (!userId) return;
        try {
            socket.userId = String(userId);
            io.userSocketMap = io.userSocketMap || {};
            const key = String(userId);
            const prev = io.userSocketMap[key];
            if (!prev) io.userSocketMap[key] = socket.id;
            else if (Array.isArray(prev)) {
                if (!prev.includes(socket.id)) prev.push(socket.id);
            } else if (prev !== socket.id) {
                io.userSocketMap[key] = [prev, socket.id];
            }
        } catch (e) { /* noop */ }
    });
};
