const userService = require('../services/userService');
const groupService = require('../services/groupService');
const friendService = require('../services/friendService');

exports.renderHome = async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }
    const user = await userService.getUserById(req.session.userId);
    const friends = await friendService.getFriendsOfUser(user._id);
    const groups = await groupService.getGroupsOfUser(user._id);
    res.render('home', { user, friends, groups });
};
