const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

router.post('/respond', async (req, res) => {
    // body: { prompt: string }
    const { prompt } = req.body || {};
    try {
        const result = await aiService.getResponse(prompt || '');
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message || 'AI error' });
    }
});

module.exports = router;
