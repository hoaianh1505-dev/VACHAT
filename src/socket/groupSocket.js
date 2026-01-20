const Group = require('../models/Group');

module.exports = (io, socket) => {
    // join a group room
    socket.on('join-group', (groupId) => {
        if (!groupId) return;
        try { socket.join(`group_${String(groupId)}`); } catch (e) { /* noop */ }
    });

    // leave a group room
    socket.on('leave-group', (groupId) => {
        if (!groupId) return;
        try { socket.leave(`group_${String(groupId)}`); } catch (e) { /* noop */ }
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
