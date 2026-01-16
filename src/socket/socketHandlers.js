module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('register-user', (userId) => {
            io.userSocketMap[userId] = socket.id;
        });

        socket.on('chat message', (msg) => {
            // Gửi cho người gửi (isSelf: true)
            if (io.userSocketMap[msg.chat.id]) {
                io.to(socket.id).emit('chat message', { ...msg, isSelf: true });
            }
            // Gửi cho người nhận (isSelf: false)
            if (msg.chat.type === 'friend' && io.userSocketMap[msg.chat.id]) {
                io.to(io.userSocketMap[msg.chat.id]).emit('chat message', { ...msg, isSelf: false });
            }
            // Nếu là group thì cần xử lý riêng cho từng thành viên (chưa làm)
        });

        socket.on('disconnect', () => {
            for (const [uid, sid] of Object.entries(io.userSocketMap)) {
                if (sid === socket.id) delete io.userSocketMap[uid];
            }
        });

        // ...handlers cho group...
    });
};
