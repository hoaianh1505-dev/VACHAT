const userSocket = require('./userSocket');
const messageSocket = require('./messageSocket');
const groupSocket = require('./groupSocket');
const friendSocket = require('./friendSocket');

module.exports = (io) => {
    // per-server maps: userId -> Set(socketId), socketId -> userId
    io.userSockets = io.userSockets || {}; // { userId: Set<socketId> }
    io.socketUser = io.socketUser || {};   // { socketId: userId }

    // helper: emit to all sockets of a user
    io.emitToUser = function (userId, event, payload) {
        if (!userId) return;
        try {
            const uid = String(userId);
            const s = io.userSockets[uid];
            if (s && s.size) {
                for (const sid of s) io.to(sid).emit(event, payload);
            }
        } catch (e) { /* noop */ }
    };

    io.on('connection', (socket) => {
        // lightweight registration: client calls register(userId) after auth
        socket.on('register-user', (userId) => {
            if (!userId) return;
            const uid = String(userId);
            // add to set
            io.userSockets[uid] = io.userSockets[uid] || new Set();
            io.userSockets[uid].add(socket.id);
            io.socketUser[socket.id] = uid;
            socket.userId = uid;
            // optional debug
            try { console.log('socket register', uid, socket.id); } catch (e) { }
        });

        // load pluggable handlers (best-effort)
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
            // optional debug
            try { console.log('socket disconnect', sid, uid); } catch (e) { }
        });
    });
};
