const userSocket = require('./userSocket');
const messageSocket = require('./messageSocket');
const groupSocket = require('./groupSocket');
const friendSocket = require('./friendSocket');

module.exports = (io) => {
    // initialize maps if missing
    io.userSocketMap = io.userSocketMap || {};    // userId -> single socketId (legacy compat)
    io.userSockets = io.userSockets || {};        // userId -> Set of socketIds
    io.socketUser = io.socketUser || {};          // socketId -> userId

    // helper: emit to all sockets of a user (prefer this)
    io.emitToUser = function (userId, event, payload) {
        try {
            const uid = String(userId);
            // prefer sending to all known sockets
            const set = io.userSockets[uid];
            if (set && set.size) {
                for (const sid of set) {
                    io.to(sid).emit(event, payload);
                }
                return;
            }
            // fallback to single-map (legacy)
            const sid = io.userSocketMap[uid];
            if (sid) io.to(sid).emit(event, payload);
        } catch (e) { /* noop */ }
    };

    io.on('connection', (socket) => {
        // allow client to register its user id after authentication
        socket.on('register-user', (userId) => {
            if (!userId) return;
            const uid = String(userId);
            io.userSocketMap[uid] = socket.id; // legacy single mapping
            io.userSockets[uid] = io.userSockets[uid] || new Set();
            io.userSockets[uid].add(socket.id);
            io.socketUser[socket.id] = uid;
            socket.userId = uid;
        });

        // group room helpers (also available in groupSocket)
        socket.on('join-group', (groupId) => {
            if (!groupId) return;
            socket.join(`group_${String(groupId)}`);
        });
        socket.on('leave-group', (groupId) => {
            if (!groupId) return;
            socket.leave(`group_${String(groupId)}`);
        });

        // register module handlers (best-effort)
        try {
            require('./messageSocket')(io, socket);
        } catch (e) { console.warn('load messageSocket failed', e); }
        try {
            require('./friendSocket')(io, socket);
        } catch (e) { /* noop */ }
        try {
            require('./aiSocket')(io, socket);
        } catch (e) { /* noop */ }
        try {
            require('./userSocket')(io, socket);
        } catch (e) { /* noop */ }
        try {
            require('./groupSocket')(io, socket);
        } catch (e) { /* noop */ }

        // cleanup on disconnect
        socket.on('disconnect', () => {
            const sid = socket.id;
            const uid = io.socketUser[sid] || socket.userId;
            if (uid) {
                // remove from per-user set
                const set = io.userSockets[String(uid)];
                if (set) {
                    set.delete(sid);
                    if (set.size === 0) delete io.userSockets[String(uid)];
                    else io.userSocketMap[String(uid)] = Array.from(set)[0]; // update legacy map to an existing socket
                }
                // clear legacy mapping if it pointed to this socket
                if (io.userSocketMap[String(uid)] === sid) delete io.userSocketMap[String(uid)];
            }
            delete io.socketUser[sid];
        });
    });
};
