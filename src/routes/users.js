const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/search', async (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({});
    const user = await User.findOne({ username: username }).lean();
    res.json({ user });
});

module.exports = router;
