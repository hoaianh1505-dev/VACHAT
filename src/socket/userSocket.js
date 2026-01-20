module.exports = (io, socket) => {
    // diagnostics
    socket.on('ping', (payload) => { socket.emit('pong', payload || {}); });
    socket.on('whoami', () => { socket.emit('whoami', { userId: socket.userId || null }); });

    // client may emit 'register-user' to associate socket with userId
    const User = require('../models/User');

    async function announceToFriends(userId, event) {
        try {
            const u = await User.findById(userId).select('friends').lean();
            if (!u || !Array.isArray(u.friends)) return;
            for (const f of u.friends) {
                if (typeof io.emitToUser === 'function') io.emitToUser(String(f), event, { userId: String(userId) });
                else if (io.userSocketMap && io.userSocketMap[String(f)]) {
                    const sid = io.userSocketMap[String(f)];
                    try { io.to(sid).emit(event, { userId: String(userId) }); } catch (e) { /* noop */ }
                }
            }
        } catch (e) { /* noop */ }
    }

    function addSocketToMap(userId, sid) {
        if (!userId || !sid) return;
        io.userSocketMap = io.userSocketMap || {};
        const key = String(userId);
        const prev = io.userSocketMap[key];
        if (!prev) io.userSocketMap[key] = sid;
        else if (Array.isArray(prev)) {
            if (!prev.includes(sid)) prev.push(sid);
        } else if (prev !== sid) {
            io.userSocketMap[key] = [prev, sid];
        }
    }

    function removeSocketId(sid) {
        if (!sid) return;
        for (const k of Object.keys(io.userSocketMap || {})) {
            const v = io.userSocketMap[k];
            if (Array.isArray(v)) {
                const idx = v.indexOf(sid);
                if (idx >= 0) {
                    v.splice(idx, 1);
                    io.userSocketMap[k] = v.length === 1 ? v[0] : v;
                }
            } else if (v === sid) {
                delete io.userSocketMap[k];
            }
        }
    }

    socket.on('register-user', async (userId) => {
        try {
            if (!userId) return;
            socket.userId = String(userId);
            addSocketToMap(socket.userId, socket.id);
            // ack registration
            try { socket.emit('registered', { userId: socket.userId }); } catch (e) { /* noop */ }
            // announce online to friends (best-effort)
            await announceToFriends(socket.userId, 'friend-online');
        } catch (e) { /* noop */ }
    });

    socket.on('disconnect', async () => {
        try {
            const uid = socket.userId;
            removeSocketId(socket.id);
            // if no remaining sockets for this user, announce offline
            const remaining = io.userSocketMap && io.userSocketMap[String(uid)];
            if (!remaining && uid) await announceToFriends(uid, 'friend-offline');
        } catch (e) { /* noop */ }
    });
};
