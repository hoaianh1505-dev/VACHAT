module.exports = (io, socket) => {
    socket.on('ping-friend', (payload) => {
        socket.emit('pong', payload || {});
    });
    // server emits 'friend-request' and 'friend-accepted' from controllers/services
};
