// minimal socket client helper
const socketClient = (() => {
    const socket = io();
    return {
        socket,
        register(userId) {
            if (userId) socket.emit('register-user', userId);
        }
    };
})();
window.socketClient = socketClient;
