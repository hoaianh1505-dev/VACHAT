const Group = require('../models/Group');
const User = require('../models/User');

exports.list = async (req, res) => {
    const groups = await Group.find({}).select('name members createdAt');
    res.json({ groups });
};

exports.create = async (req, res) => {
    const { name, members = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const group = await Group.create({ name, members });
    res.json({ success: true, group });
};

exports.addMember = async (req, res) => {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) return res.status(400).json({ error: 'Missing ids' });
    await Group.findByIdAndUpdate(groupId, { $addToSet: { members: userId } });
    res.json({ success: true });
};

exports.removeMember = async (req, res) => {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) return res.status(400).json({ error: 'Missing ids' });
    await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } });
    res.json({ success: true });
};
