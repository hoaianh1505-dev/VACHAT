const friendService = require('../services/friendService');
const asyncHandler = require('../utils/asyncHandler');
const response = require('../utils/response');

exports.searchUser = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    if (!sessionUser) return response.err(res, 'Bạn chưa đăng nhập.', 401);

    const { username } = req.query;
    if (!username || !username.trim()) return response.err(res, 'Thiếu username.', 400);

    const result = await friendService.searchUser(sessionUser._id, username);
    if (!result) return response.err(res, 'Không tìm thấy user.', 404);
    if (result.self) return response.err(res, 'Không thể tìm chính mình.', 400);
    if (result.alreadyFriend) return response.err(res, 'Đã là bạn bè.', 400);

    return response.ok(res, result);
});

exports.addFriend = asyncHandler(async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.body;
    if (!toId || String(fromId) === String(toId)) return response.err(res, 'Invalid request', 400);

    await friendService.createRequest({ fromId, toId, io: req.app.get('io') });
    return response.ok(res, { success: true });
});

exports.checkFriendRequest = asyncHandler(async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.query;
    if (!toId || String(fromId) === String(toId)) return response.ok(res, { status: 'none' });

    const status = await friendService.checkRequestStatus(fromId, toId);
    return response.ok(res, { status });
});

exports.cancelFriendRequest = asyncHandler(async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.body;
    await friendService.cancelRequest({ fromId, toId });
    return response.ok(res, { success: true });
});

exports.pendingFriendRequests = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const requests = await friendService.pendingFor(userId);
    return response.ok(res, { requests });
});

exports.acceptFriendRequest = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { requestId } = req.body;
    const result = await friendService.acceptRequest({ requestId, userId, io: req.app.get('io') });

    // return friend info to client for immediate UI update
    const sender = result && result.sender ? { _id: result.sender._id, username: result.sender.username, avatar: result.sender.avatar } : null;
    return response.ok(res, { success: true, friend: sender });
});

exports.rejectFriendRequest = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { requestId } = req.body;
    await friendService.rejectRequest({ requestId, userId });
    return response.ok(res, { success: true });
});

exports.removeFriend = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { friendId } = req.body;
    // Updated to use friendService instead of userService
    await friendService.removeFriend({ userId, friendId });
    return response.ok(res, { success: true });
});
