const userSocket = require('./userSocket');
const messageSocket = require('./messageSocket');
const groupSocket = require('./groupSocket');
const friendSocket = require('./friendSocket');
const aiSocket = require('./aiSocket');

module.exports = (io) => {
    // ensure map exists
    io.userSocketMap = io.userSocketMap || {};

    // helper to get socket id and emit to a user
    io.getSocketId = (userId) => io.userSocketMap && io.userSocketMap[String(userId)];
    io.emitToUser = (userId, event, payload) => {
        const sid = io.getSocketId(userId);
        if (sid) io.to(sid).emit(event, payload);
    };

    io.on('connection', (socket) => {
        console.log('socket connected:', socket.id);
        // delegate to modules
        try {
            userSocket(io, socket);
            messageSocket(io, socket);
            groupSocket(io, socket);
            friendSocket(io, socket);
            aiSocket(io, socket);
        } catch (err) {
            console.warn('socket module init error', err);
        }

        socket.on('disconnect', (reason) => {
            console.log('socket disconnected:', socket.id, 'reason:', reason);
            // cleanup mapping
            if (io.userSocketMap) {
                for (const [uid, sid] of Object.entries(io.userSocketMap)) {
                    if (sid === socket.id) delete io.userSocketMap[uid];
                }
            }
        });
    });
};
