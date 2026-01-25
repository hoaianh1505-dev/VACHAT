const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');

exports.listGroups = async () => {
    return Group.find({}).select('name members createdAt');
};

exports.getMembers = async ({ groupId, userId }) => {
    if (!groupId) throw new Error('Missing groupId');
    const g = await Group.findById(groupId).populate('members', 'username avatar').exec();
    if (!g) {
        const e = new Error('Group not found');
        e.status = 404;
        throw e;
    }
    if (userId && !g.members.map(m => String(m._id)).includes(String(userId))) {
        const e = new Error('Forbidden');
        e.status = 403;
        throw e;
    }
    return (g.members || []).map(m => ({ _id: String(m._id), username: m.username, avatar: m.avatar }));
};

exports.createGroup = async ({ name, members, creatorId, io }) => {
    const selected = Array.isArray(members) ? members.map(String).filter(Boolean) : [];
    if (!name || !selected.length) throw new Error('Missing name or members');
    if (selected.length < 2) throw new Error('Chọn ít nhất 2 bạn để tạo nhóm');

    const allMembers = Array.from(new Set([creatorId, ...selected]));

    const group = await Group.create({ name, members: allMembers });

    try {
        await User.updateMany({ _id: { $in: allMembers } }, { $addToSet: { groups: group._id } });
    } catch (e) {
        console.warn('update users with group failed', e);
    }

    try {
        if (io && typeof io.emitToUser === 'function') {
            for (const m of allMembers) {
                io.emitToUser(String(m), 'group-added', { group: { _id: String(group._id), name: group.name, members: allMembers } });
            }
        } else if (io && io.userSocketMap) {
            for (const m of allMembers) {
                const sid = io.userSocketMap[String(m)];
                if (sid) io.to(sid).emit('group-added', { group: { _id: String(group._id), name: group.name, members: allMembers } });
            }
        }
    } catch (e) { console.warn('emit group-added failed', e); }

    return group;
};

exports.addMember = async ({ groupId, userId }) => {
    if (!groupId || !userId) throw new Error('Missing ids');
    await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } });
    await User.findByIdAndUpdate(userId, { $addToSet: { groups: groupId } });
};

exports.removeMember = async ({ groupId, userId }) => {
    if (!groupId || !userId) throw new Error('Missing ids');
    await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { groups: groupId } });
};

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
