module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('register-user', (userId) => {
            io.userSocketMap[userId] = socket.id;
            socket.userId = userId; // Lưu userId vào socket để xác định người gửi
        });

        socket.on('chat message', (msg) => {
            // Chỉ xử lý chat giữa bạn bè (type: 'friend')
            if (msg.chat.type === 'friend') {
                const fromId = socket.userId;
                const toId = msg.chat.id;
                // Gửi cho người gửi (isSelf: true)
                if (fromId && io.userSocketMap[fromId]) {
                    io.to(io.userSocketMap[fromId]).emit('chat message', {
                        chat: msg.chat,
                        message: msg.message,
                        from: fromId,
                        to: toId,
                        createdAt: msg.createdAt || new Date(),
                        isSelf: true
                    });
                }
                // Gửi cho người nhận (isSelf: false)
                if (toId && io.userSocketMap[toId]) {
                    io.to(io.userSocketMap[toId]).emit('chat message', {
                        chat: msg.chat,
                        message: msg.message,
                        from: fromId,
                        to: toId,
                        createdAt: msg.createdAt || new Date(),
                        isSelf: false
                    });
                }
            }
            // ...handlers cho group...
        });

        socket.on('disconnect', () => {
            for (const [uid, sid] of Object.entries(io.userSocketMap)) {
                if (sid === socket.id) delete io.userSocketMap[uid];
            }
        });

        // ...existing code...
    });
};
