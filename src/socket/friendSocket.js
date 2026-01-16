// ...handle friend-related socket events...
module.exports = (io, socket) => {
    // Khi user đăng nhập, lưu userId vào socket
    socket.on('login', (userId) => {
        socket.userId = userId;
        socket.join(userId); // Để có thể gửi tới userId
    });

    socket.on('friendRequest', ({ to, username }) => {
        // Gửi thông báo tới user nhận (userId là room)
        io.to(to).emit('friendRequestNotify', { fromUsername: socket.userId ? socket.userId : username });
    });
};
