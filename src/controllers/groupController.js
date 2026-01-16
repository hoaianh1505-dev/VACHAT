const groupService = require('../services/groupService');

exports.createGroup = async (req, res) => {
    try {
        const group = await groupService.createGroup(req.body);
        res.status(201).json(group);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getGroups = async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const groups = await groupService.getGroupsOfUser(userId);
    res.json(groups);
};
