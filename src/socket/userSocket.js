module.exports = (io, socket) => {
    // register
    socket.on('register-user', async (userId) => {
        const uid = String(userId);
        io.userSocketMap = io.userSocketMap || {};
        io.userSocketMap[uid] = socket.id;
        socket.userId = uid;
        // ack back to client
        socket.emit('registered', { userId: uid });
        // debug log
        console.log(`user registered socket: ${uid} -> ${socket.id}`);

        // NEW: emit all pending friend requests for this user so they see any requests created earlier
        try {
            const FriendRequest = require('../models/FriendRequest');
            const pendings = await FriendRequest.find({ to: uid, status: 'pending' }).populate('from', '_id username avatar');
            if (Array.isArray(pendings) && pendings.length) {
                for (const p of pendings) {
                    const fromUser = p.from ? { _id: String(p.from._id), username: p.from.username, avatar: p.from.avatar } : null;
                    // emit directly to this socket (registered now)
                    socket.emit('friend-request', { toId: uid, fromUser, requestId: String(p._id) });
                }
            }
        } catch (e) {
            console.warn('emit pending friend requests failed', e);
        }
    });

    // simple ping/pong and whoami helper
    socket.on('ping', (payload) => {
        socket.emit('pong', payload || {});
    });
    socket.on('whoami', () => {
        socket.emit('whoami', { userId: socket.userId || null });
    });
    // could add more user-specific realtime handlers here
};
