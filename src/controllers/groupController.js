const Group = require('../models/Group');
const User = require('../models/User');

exports.list = async (req, res) => {
    const groups = await Group.find({}).select('name members createdAt');
    res.json({ groups });
};

exports.create = async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

    const { name, members } = req.body;
    const selected = Array.isArray(members) ? members.map(String).filter(Boolean) : [];
    if (!name || !selected.length) return res.status(400).json({ error: 'Missing name or members' });
    // yêu cầu ít nhất 2 bạn (khác creator)
    if (selected.length < 2) return res.status(400).json({ error: 'Chọn ít nhất 2 bạn để tạo nhóm' });

    // ensure creator included
    const creatorId = String(sessionUser._id);
    const allMembers = Array.from(new Set([creatorId, ...selected]));

    const group = await Group.create({ name, members: allMembers });

    // add group id to each user's groups array
    try {
        await User.updateMany({ _id: { $in: allMembers } }, { $addToSet: { groups: group._id } });
    } catch (e) {
        console.warn('update users with group failed', e);
    }

    // realtime notify members (best-effort)
    try {
        const io = req.app.get('io');
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

    return res.json({ success: true, group });
};

exports.addMember = async (req, res) => {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) return res.status(400).json({ error: 'Missing ids' });
    await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } });
    await User.findByIdAndUpdate(userId, { $addToSet: { groups: groupId } });
    res.json({ success: true });
};

exports.removeMember = async (req, res) => {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) return res.status(400).json({ error: 'Missing ids' });
    await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { groups: groupId } });
    res.json({ success: true });
};
