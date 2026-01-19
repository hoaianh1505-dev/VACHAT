const Group = require('../models/Group');

module.exports = (io, socket) => {
    socket.on('join-group', (groupId) => {
        if (!groupId) return;
        socket.join(`group_${String(groupId)}`);
    });

    socket.on('leave-group', (groupId) => {
        if (!groupId) return;
        socket.leave(`group_${String(groupId)}`);
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
