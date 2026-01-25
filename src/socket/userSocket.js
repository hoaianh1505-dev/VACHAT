module.exports = (io, socket) => {
    // diagnostics
    socket.on('ping', (payload) => { socket.emit('pong', payload || {}); });
    socket.on('whoami', () => { socket.emit('whoami', { userId: socket.userId || null }); });

    // client may emit 'register-user' to associate socket with userId
    const User = require('../models/User');

    async function announceToFriends(userId, event, payload) {
        try {
            const u = await User.findById(userId).select('friends').lean();
            if (!u || !Array.isArray(u.friends)) return;
            for (const f of u.friends) {
                const data = payload ? { ...payload } : { userId: String(userId) };
                if (!data.userId) data.userId = String(userId);
                if (typeof io.emitToUser === 'function') io.emitToUser(String(f), event, data);
                else if (io.userSocketMap && io.userSocketMap[String(f)]) {
                    const sid = io.userSocketMap[String(f)];
                    try { io.to(sid).emit(event, data); } catch (e) { /* noop */ }
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
            await announceToFriends(socket.userId, 'friend-online', { userId: socket.userId });
        } catch (e) { /* noop */ }
    });

    socket.on('presence:sync', async (friendIds) => {
        try {
            if (!Array.isArray(friendIds)) return;
            const ids = friendIds.map(String).filter(Boolean);
            if (!ids.length) return;
            const users = await User.find({ _id: { $in: ids } }).select('_id lastActive').lean();
            const map = new Map((users || []).map(u => [String(u._id), u.lastActive || null]));
            const states = ids.map(id => ({
                userId: String(id),
                online: !!(io.userSocketMap && io.userSocketMap[String(id)]),
                lastActive: map.get(String(id)) || null
            }));
            try { socket.emit('presence:state', states); } catch (e) { /* noop */ }
        } catch (e) { /* noop */ }
    });

    socket.on('disconnect', async () => {
        try {
            const uid = socket.userId;
            removeSocketId(socket.id);
            // if no remaining sockets for this user, announce offline
            const remaining = io.userSocketMap && io.userSocketMap[String(uid)];
            if (!remaining && uid) {
                let lastActive = new Date();
                try { await User.findByIdAndUpdate(uid, { lastActive }, { new: false }); } catch (e) { /* noop */ }
                await announceToFriends(uid, 'friend-offline', { userId: String(uid), lastActive });
            }
        } catch (e) { /* noop */ }
    });
};
