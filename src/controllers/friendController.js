const friendService = require('../services/friendService');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

exports.searchUser = asyncHandler(async (req, res) => {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.json({ error: 'Bạn chưa đăng nhập.' });
    const { username } = req.query;
    if (!username || !username.trim()) return res.json({ error: 'Thiếu username.' });
    const result = await friendService.searchUser(sessionUser._id, username);
    if (!result) return res.json({ error: 'Không tìm thấy user.' });
    if (result.self) return res.json({ error: 'Không thể tìm chính mình.' });
    if (result.alreadyFriend) return res.json({ error: 'Đã là bạn bè.' });
    res.json(result);
});

exports.addFriend = asyncHandler(async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.body;
    if (!toId || String(fromId) === String(toId)) return res.json({ error: 'Invalid request' });
    await friendService.createRequest({ fromId, toId, io: req.app.get('io') });
    res.json({ success: true });
});

exports.checkFriendRequest = asyncHandler(async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.query;
    if (!toId || String(fromId) === String(toId)) return res.json({ status: 'none' });
    const exist = await require('../models/FriendRequest').findOne({ from: fromId, to: toId, status: 'pending' });
    res.json({ status: exist ? 'pending' : 'none' });
});

exports.cancelFriendRequest = asyncHandler(async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.body;
    await friendService.cancelRequest({ fromId, toId });
    res.json({ success: true });
});

exports.pendingFriendRequests = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const requests = await friendService.pendingFor(userId);
    res.json({ requests });
});

exports.acceptFriendRequest = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { requestId } = req.body;
    const result = await friendService.acceptRequest({ requestId, userId, io: req.app.get('io') });
    // return friend info to client for immediate UI update
    const sender = result && result.sender ? { _id: result.sender._id, username: result.sender.username, avatar: result.sender.avatar } : null;
    res.json({ success: true, friend: sender });
});

exports.rejectFriendRequest = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { requestId } = req.body;
    await friendService.rejectRequest({ requestId, userId });
    res.json({ success: true });
});

exports.removeFriend = asyncHandler(async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { friendId } = req.body;
    await userService.removeFriend(userId, friendId);
    res.json({ success: true });
});
