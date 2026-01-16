const messageService = require('../services/messageService');

exports.listForUser = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        if (!userId) return res.json({ conversations: [] });
        const convs = await messageService.listConversations({ userId });
        res.json({ conversations: convs });
    } catch (e) {
        console.error(e);
        res.json({ conversations: [] });
    }
};
