const User = require('../models/User');
const userService = require('../services/userService');

exports.index = (req, res) => {
    res.render('index', { user: req.session && req.session.user ? req.session.user : null });
};

exports.chat = async (req, res) => {
    const sessionUser = req.session.user;
    const user = await userService.getById(sessionUser._id);
    res.render('chat', {
        user,
        friends: user.friends || [],
        groups: user.groups || []
    });
};