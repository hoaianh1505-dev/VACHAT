const asyncHandler = require('../utils/asyncHandler');
const messageService = require('../services/messageService');
const response = require('../utils/response');

exports.sendMessage = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { chatType, chatId, message } = req.body || {};
    if (!chatType || !chatId || !message) return response.err(res, 'Missing fields', 400);

    const io = req.app.get('io');
    const msg = await messageService.createMessage({
        chatType,
        chatId,
        fromId: String(sessionUser._id),
        toId: chatType === 'friend' ? chatId : undefined,
        content: message,
        io
    });
    return response.ok(res, { success: true, message: { id: String(msg._id) } });
});

exports.getMessages = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { chatType, chatId } = req.query || {};
    if (!chatType || !chatId) return response.ok(res, { messages: [] });

    const messages = await messageService.getMessages({ userId: String(sessionUser._id), chatType, chatId });
    return response.ok(res, { messages });
});

exports.uploadMessage = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { chatType, chatId } = req.body || {};
    if (!chatType || !chatId) return response.err(res, 'Missing fields', 400);
    if (!req.file) return response.err(res, 'Missing file', 400);

    const fileMeta = {
        url: `/uploads/${req.file.filename}`,
        mime: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size
    };
    const payload = `__file__:${JSON.stringify(fileMeta)}`;

    const io = req.app.get('io');
    const msg = await messageService.createMessage({
        chatType,
        chatId,
        fromId: String(sessionUser._id),
        toId: chatType === 'friend' ? chatId : undefined,
        content: payload,
        io
    });
    return response.ok(res, { success: true, message: { id: String(msg._id) } });
});

exports.deleteConversation = asyncHandler(async (req, res) => {
    // IMPORTANT: only delete messages (conversation history), do NOT delete group entity here
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { chatType, chatId } = req.body || {};
    if (!chatType || !chatId) return response.err(res, 'Missing fields', 400);

    const io = req.app.get('io');
    const result = await messageService.deleteConversation({ userId: String(sessionUser._id), chatType, chatId, io });
    return response.ok(res, { success: true, deleted: result.deletedCount || 0 });
});

exports.deleteMessage = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { messageId } = req.body || {};
    if (!messageId) return response.err(res, 'Missing messageId', 400);

    const io = req.app.get('io');
    const result = await messageService.deleteMessage({ userId: String(sessionUser._id), messageId, io });
    return response.ok(res, { success: true, deleted: result.deletedCount || 0 });
});
