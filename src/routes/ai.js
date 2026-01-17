const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const messageService = require('../services/messageService'); // NEW

// REPLACE /respond to be public (no session required)
router.post('/respond', async (req, res) => {
    const { prompt } = req.body || {};
    const p = String(prompt || '').trim();
    if (!p) return res.status(400).json({ success: false, error: 'Empty prompt' });

    try {
        const result = await aiService.getResponse(p, {});
        return res.json({ success: true, result });
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const message = err && err.message ? err.message : 'AI error';
        return res.status(status).json({ success: false, error: message });
    }
});

// DEBUG endpoint - public
router.post('/debug', async (req, res) => {
    const { sample } = req.body || {};
    try {
        const info = await require('../services/aiService').testGeminiKey(String(sample || 'Test tin nhắn ngắn'));
        return res.json({ success: true, info });
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        return res.status(status).json({ success: false, error: err.message || 'Debug failed' });
    }
});

// NEW: public suggest endpoint (no auth) - returns AI suggestion only (no DB write)
router.post('/suggest', async (req, res) => {
    const { prompt } = req.body || {};
    const p = String(prompt || '').trim();
    if (!p) return res.status(400).json({ success: false, error: 'Empty prompt' });
    try {
        const result = await aiService.getResponse(p, {});
        return res.json({ success: true, result });
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        const message = err && err.message ? err.message : 'AI error';
        return res.status(status).json({ success: false, error: message });
    }
});

// NEW: automatic AI reply — server reads latest incoming message and sends reply as current user
router.post('/reply', async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { chatType, chatId } = req.body || {};
    if (!chatType || !chatId) return res.status(400).json({ success: false, error: 'Missing chatType or chatId' });

    try {
        // load messages for this conversation and find latest message from the other side
        const msgs = await messageService.getMessages({ userId: sessionUser._id, chatType, chatId });
        const lastOther = [...msgs].reverse().find(m => !m.isSelf);
        if (!lastOther) return res.status(400).json({ success: false, error: 'No incoming message to reply to' });

        // call AI service to get a one-sentence reply
        const reply = await require('../services/aiService').getResponse(String(lastOther.content || '').slice(0, 1000), { userId: sessionUser._id });

        // persist and emit the reply as a normal message (from the current user)
        const created = await messageService.createMessage({
            chatType,
            chatId,
            fromId: sessionUser._id,
            toId: chatId,
            content: reply,
            io: req.app.get('io')
        });

        return res.json({ success: true, message: { id: String(created._id), text: reply } });
    } catch (err) {
        const status = err && err.status ? err.status : 500;
        return res.status(status).json({ success: false, error: err.message || 'AI reply failed' });
    }
});

module.exports = router;
