const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const response = require('../utils/response');

exports.list = asyncHandler(async (req, res) => {
    // public simple user list
    const users = await userService.list();
    return response.ok(res, { users });
});

exports.getProfile = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return response.err(res, 'Unauthorized', 401);
    const user = await userService.getById(sessionUser._id);
    return response.ok(res, { user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) return response.err(res, 'Unauthorized', 401);
    const { avatar, username } = req.body || {};
    const user = await userService.updateProfile({ userId: sessionUser._id, avatar, username });
    if (req.session && req.session.user) {
        req.session.user.username = user.username;
        req.session.user.avatar = user.avatar;
        req.session.user.email = user.email;
        req.session.user.lastUsernameChangedAt = user.lastUsernameChangedAt || null;
    }
    return response.ok(res, { user });
});
