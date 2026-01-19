const userSocket = require('./userSocket');
const messageSocket = require('./messageSocket');
const groupSocket = require('./groupSocket');
const friendSocket = require('./friendSocket');

module.exports = (io) => {
    // maintain a map of userId -> socketId for emitToUser helpers
    io.userSocketMap = io.userSocketMap || {};

    // helper: emit to user's current socket id (best-effort)
    io.emitToUser = function (userId, event, payload) {
        try {
            const sid = io.userSocketMap && io.userSocketMap[String(userId)];
            if (sid) return io.to(sid).emit(event, payload);
            // fallback: broadcast — avoid leaking to unrelated users
        } catch (e) { /* noop */ }
    };

    // load and register non-AI socket handlers
    try {
        io.on('connection', (socket) => {
            // register user on 'register-user'
            socket.on('register-user', (userId) => {
                if (userId) {
                    io.userSocketMap[String(userId)] = socket.id;
                    socket.userId = String(userId);
                }
            });

            // attach handlers
            userSocket(io, socket);
            friendSocket(io, socket);
            messageSocket(io, socket);
            groupSocket(io, socket);

            socket.on('disconnect', () => {
                // cleanup map entries
                try {
                    if (socket.userId && io.userSocketMap && io.userSocketMap[String(socket.userId)] === socket.id) {
                        delete io.userSocketMap[String(socket.userId)];
                    }
                } catch (e) { /* noop */ }
            });
        });
    } catch (e) {
        console.warn('socketHandlers init error:', e && e.message ? e.message : e);
    }
};
