module.exports = (io, socket) => {
    // register
    socket.on('register-user', (userId) => {
        const uid = String(userId);
        io.userSocketMap = io.userSocketMap || {};
        io.userSocketMap[uid] = socket.id;
        socket.userId = uid;
        // ack back to client
        socket.emit('registered', { userId: uid });
        // debug log
        console.log(`user registered socket: ${uid} -> ${socket.id}`);
    });
    // note: disconnect cleanup handled centrally in socketHandlers
};
