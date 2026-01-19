const mongoose = require('mongoose');
const Message = require('../models/Message');
const messageService = require('../services/messageService');
const asyncHandler = require('../utils/asyncHandler');

exports.sendMessage = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { chatType, chatId, message } = req.body;
    if (!userId || !chatType || !chatId || !message) return res.json({ error: 'Thiếu thông tin' });

    const io = req.app.get('io');
    const msg = await messageService.createMessage({
        chatType,
        chatId,
        fromId: userId,
        toId: chatType === 'friend' ? chatId : undefined,
        content: message,
        io
    });
    res.json({ success: true, message: msg });
});

exports.getMessages = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { chatType, chatId } = req.query;
    if (!userId || !chatType || !chatId) return res.json({ messages: [] });
    const messages = await messageService.getMessages({ userId, chatType, chatId });
    res.json({ messages });
});

exports.deleteConversation = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { chatType, chatId } = req.body;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!chatType || !chatId) return res.status(400).json({ success: false, error: 'Thiếu thông tin' });

    try {
        const io = req.app.get('io');
        const result = await messageService.deleteConversation({ userId: String(userId), chatType, chatId, io });
        return res.json({ success: true, deleted: result.deletedCount || 0 });
    } catch (e) {
        console.error('deleteConversation error', e);
        return res.status(500).json({ success: false, error: e.message || 'Xóa cuộc trò chuyện thất bại' });
    }
});
