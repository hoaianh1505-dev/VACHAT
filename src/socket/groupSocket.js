const Group = require('../models/Group');

module.exports = (io, socket) => {
    socket.on('join-group', (groupId) => {
        if (!groupId) return;
        const room = `group_${groupId}`;
        socket.join(room);
        console.log(`socket ${socket.id} joined ${room}`);
    });

    socket.on('group message', (data) => {
        if (!data || !data.groupId || !data.message) return;
        const room = `group_${data.groupId}`;
        io.to(room).emit('group message', {
            ...data,
            from: socket.userId,
            createdAt: data.createdAt || new Date()
        });
    });
};
