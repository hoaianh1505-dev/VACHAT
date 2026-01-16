module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('register-user', (userId) => {
            io.userSocketMap[userId] = socket.id;
        });

        socket.on('chat message', (msg) => {
            io.emit('chat message', msg);
        });

        socket.on('disconnect', () => {
            for (const [uid, sid] of Object.entries(io.userSocketMap)) {
                if (sid === socket.id) delete io.userSocketMap[uid];
            }
        });

        // ...handlers cho group...
    });
};
