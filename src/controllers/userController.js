const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await userService.getById(userId);
    res.json({ ok: true, user });
});

exports.list = asyncHandler(async (req, res) => {
    const users = await userService.list();
    res.json({ ok: true, users });
});
