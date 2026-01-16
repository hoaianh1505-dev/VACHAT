const friendService = require('../services/friendService');

exports.sendFriendRequest = async (req, res) => {
    const { to } = req.body;
    const from = req.session.userId;
    if (!from) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const request = await friendService.sendFriendRequest(from, to);
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    const { requestId } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const friend = await friendService.acceptFriendRequest(requestId, userId);
        res.json(friend);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
