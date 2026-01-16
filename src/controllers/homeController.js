const User = require('../models/User');
const userService = require('../services/userService');

exports.index = (req, res) => {
    res.render('index');
};

exports.chat = async (req, res) => {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.redirect('/login');
    const user = await userService.getById(sessionUser._id);
    res.render('chat', {
        user,
        friends: user.friends || [],
        groups: user.groups || []
    });
};