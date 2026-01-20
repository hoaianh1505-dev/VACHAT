const Group = require('../models/Group');

module.exports = (io, socket) => {
    // join a group room (only if user is a group member)
    socket.on('join-group', async (groupId, ack) => {
        try {
            if (!groupId) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Missing groupId' });
                return;
            }
            if (!socket.userId) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Not registered' });
                return;
            }
            const g = await Group.findById(groupId).select('members').lean();
            if (!g) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Group not found' });
                return;
            }
            if (!Array.isArray(g.members) || !g.members.map(String).includes(String(socket.userId))) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Not a member' });
                return;
            }
            socket.join(`group_${String(groupId)}`);
            if (typeof ack === 'function') ack({ success: true });
        } catch (e) {
            if (typeof ack === 'function') ack({ success: false, error: e.message || 'Join failed' });
        }
    });

    // leave a group room
    socket.on('leave-group', (groupId, ack) => {
        try {
            if (!groupId) {
                if (typeof ack === 'function') return ack({ success: false, error: 'Missing groupId' });
                return;
            }
            socket.leave(`group_${String(groupId)}`);
            if (typeof ack === 'function') ack({ success: true });
        } catch (e) {
            if (typeof ack === 'function') ack({ success: false, error: e.message || 'Leave failed' });
        }
    });

    // optional ping/pong for diagnostics
    socket.on('ping-group', (payload) => {
        try { socket.emit('pong-group', payload || {}); } catch (e) { /* noop */ }
    });

    // typing indicator in group
    socket.on('group-typing', (groupId, isTyping = true) => {
        if (!groupId) return;
        try { socket.to(`group_${String(groupId)}`).emit('group-typing', { groupId: String(groupId), userId: socket.userId, isTyping }); } catch (e) { /* noop */ }
    });

    // mark messages in group as read (accepts array of messageIds)
    socket.on('group-mark-read', async (groupId, messageIds = []) => {
        if (!groupId || !Array.isArray(messageIds) || !messageIds.length) return;
        try {
            const messageService = require('../services/messageService');
            await messageService.markRead({ messageIds, userId: String(socket.userId) });
            // notify room members optionally
            socket.to(`group_${String(groupId)}`).emit('group-read-receipt', { groupId: String(groupId), userId: socket.userId, messageIds });
        } catch (e) { /* noop */ }
    });
};
