const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const messageService = require('./messageService');

exports.deleteGroup = async ({ userId, groupId, io } = {}) => {
    if (!userId || !groupId) {
        const e = new Error('Missing fields');
        e.status = 400;
        throw e;
    }
    const ObjectId = mongoose.Types.ObjectId;
    const g = await Group.findById(groupId).exec();
    if (!g) {
        const e = new Error('Group not found');
        e.status = 404;
        throw e;
    }
    // permission: requester must be a member to delete (simple rule)
    if (!g.members.map(m => String(m)).includes(String(userId))) {
        const e = new Error('Forbidden: not a group member');
        e.status = 403;
        throw e;
    }

    // delete messages for group
    const msgRes = await Message.deleteMany({ chatType: 'group', chatId: new ObjectId(groupId) });

    // remove group reference from users
    try {
        await User.updateMany({ _id: { $in: g.members } }, { $pull: { groups: g._id } });
    } catch (err) {
        console.warn('groupService: failed to pull group from users', err);
    }

    // delete the group document
    await Group.deleteOne({ _id: g._id });

    // realtime: notify members (best-effort)
    try {
        if (io && typeof io.emitToUser === 'function') {
            for (const m of g.members) {
                io.emitToUser(String(m), 'group-removed', { groupId: String(groupId) });
            }
            // also notify group room if still exists
            if (io && typeof io.to === 'function') io.to(`group_${String(groupId)}`).emit('conversation-deleted', { chatType: 'group', chatId: String(groupId) });
        } else if (io && io.userSocketMap) {
            for (const m of g.members) {
                const sid = io.userSocketMap[String(m)];
                if (sid) io.to(sid).emit('group-removed', { groupId: String(groupId) });
            }
            if (io && typeof io.to === 'function') io.to(`group_${String(groupId)}`).emit('conversation-deleted', { chatType: 'group', chatId: String(groupId) });
        }
    } catch (e) {
        console.warn('groupService emit failed', e);
    }

    return { deletedCount: msgRes.deletedCount || 0 };
};
