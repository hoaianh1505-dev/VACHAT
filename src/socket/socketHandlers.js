const userSocket = require('./userSocket');
const messageSocket = require('./messageSocket');
const groupSocket = require('./groupSocket');
const friendSocket = require('./friendSocket');

module.exports = (io) => {
    // initialize maps (userId -> Set(socketId)), (socketId -> userId)
    io.userSockets = io.userSockets || {};
    io.socketUser = io.socketUser || {};

    // helper: emit to all sockets of a user
    io.emitToUser = function (userId, event, payload) {
        if (!userId) return;
        try {
            const uid = String(userId);
            const sockets = io.userSockets[uid];
            if (sockets && sockets.size) {
                for (const sid of sockets) io.to(sid).emit(event, payload);
            }
        } catch (e) { /* noop */ }
    };

    io.on('connection', (socket) => {
        // allow registration (client should call after auth)
        socket.on('register-user', (userId) => {
            if (!userId) return;
            const uid = String(userId);
            io.userSockets[uid] = io.userSockets[uid] || new Set();
            io.userSockets[uid].add(socket.id);
            io.socketUser[socket.id] = uid;
            socket.userId = uid;
            // optional ack for debug
            try { socket.emit('user-registered', { userId: uid }); } catch (e) { }
        });

        // join/leave group rooms convenience
        socket.on('join-group', (groupId) => { if (groupId) socket.join(`group_${String(groupId)}`); });
        socket.on('leave-group', (groupId) => { if (groupId) socket.leave(`group_${String(groupId)}`); });

        // load modular handlers (best-effort)
        try { require('./messageSocket')(io, socket); } catch (e) { /* noop */ }
        try { require('./friendSocket')(io, socket); } catch (e) { /* noop */ }
        try { require('./aiSocket')(io, socket); } catch (e) { /* noop */ }
        try { require('./userSocket')(io, socket); } catch (e) { /* noop */ }
        try { require('./groupSocket')(io, socket); } catch (e) { /* noop */ }

        // cleanup on disconnect
        socket.on('disconnect', () => {
            const sid = socket.id;
            const uid = io.socketUser[sid] || socket.userId;
            if (uid) {
                const set = io.userSockets[String(uid)];
                if (set) {
                    set.delete(sid);
                    if (set.size === 0) delete io.userSockets[String(uid)];
                }
            }
            delete io.socketUser[sid];
        });
    });
};
