const messageService = require('../services/messageService');

exports.sendMessage = async (req, res) => {
    const { receiver, content } = req.body;
    const sender = req.session.userId;
    if (!sender) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const message = await messageService.sendMessage(sender, receiver, content);
        res.status(201).json(message);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getMessages = async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { withUser } = req.query;
    const messages = await messageService.getMessages(userId, withUser);
    res.json(messages);
};
