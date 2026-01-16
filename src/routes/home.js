const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/chat', async (req, res) => {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.redirect('/login');
    const user = await User.findById(sessionUser._id)
        .populate('friends', 'username avatar')
        .populate('groups', 'name');
    res.render('chat', {
        user,
        friends: user.friends || [],
        groups: user.groups || []
    });
});

module.exports = router;
