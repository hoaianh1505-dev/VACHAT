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
    if (!sessionUser) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const user = await userService.getById(sessionUser._id);
    return response.ok(res, { user });
});
