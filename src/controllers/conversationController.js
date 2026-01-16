const conversationService = require('../services/conversationService');

exports.createConversation = async (req, res) => {
    try {
        const conversation = await conversationService.createConversation(req.body);
        res.status(201).json(conversation);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getConversations = async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const conversations = await conversationService.getConversationsOfUser(userId);
    res.json(conversations);
};
