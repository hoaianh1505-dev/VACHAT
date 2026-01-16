const friendService = require('../services/friendService');
const userService = require('../services/userService');

exports.searchUser = async (req, res) => {
    try {
        const sessionUser = req.session.user;
        if (!sessionUser) return res.json({ error: 'Bạn chưa đăng nhập.' });
        const { username } = req.query;
        if (!username || !username.trim()) return res.json({ error: 'Thiếu username.' });
        const result = await friendService.searchUser(sessionUser._id, username);
        if (!result) return res.json({ error: 'Không tìm thấy user.' });
        if (result.self) return res.json({ error: 'Không thể tìm chính mình.' });
        if (result.alreadyFriend) return res.json({ error: 'Đã là bạn bè.' });
        res.json(result);
    } catch (e) {
        console.error(e);
        res.json({ error: e.message || 'Lỗi' });
    }
};

exports.addFriend = async (req, res) => {
    try {
        const fromId = req.session.user._id;
        const { toId } = req.body;
        if (!toId || String(fromId) === String(toId)) return res.json({ error: 'Invalid request' });
        await friendService.createRequest({ fromId, toId, io: req.app.get('io') });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.json({ error: e.message || 'Lỗi' });
    }
};

exports.checkFriendRequest = async (req, res) => {
    try {
        const fromId = req.session.user._id;
        const { toId } = req.query;
        if (!toId || String(fromId) === String(toId)) return res.json({ status: 'none' });
        const exist = await require('../models/FriendRequest').findOne({ from: fromId, to: toId, status: 'pending' });
        res.json({ status: exist ? 'pending' : 'none' });
    } catch (e) {
        console.error(e);
        res.json({ status: 'none' });
    }
};

exports.cancelFriendRequest = async (req, res) => {
    try {
        const fromId = req.session.user._id;
        const { toId } = req.body;
        await friendService.cancelRequest({ fromId, toId });
        res.json({ success: true });
    } catch (e) { console.error(e); res.json({ error: e.message || 'Lỗi' }); }
};

exports.pendingFriendRequests = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const requests = await friendService.pendingFor(userId);
        res.json({ requests });
    } catch (e) { console.error(e); res.json({ requests: [] }); }
};

exports.acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const { requestId } = req.body;
        await friendService.acceptRequest({ requestId, userId, io: req.app.get('io') });
        res.json({ success: true });
    } catch (e) { console.error(e); res.json({ error: e.message || 'Lỗi' }); }
};

exports.rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const { requestId } = req.body;
        await friendService.rejectRequest({ requestId, userId });
        res.json({ success: true });
    } catch (e) { console.error(e); res.json({ error: e.message || 'Lỗi' }); }
};

exports.removeFriend = async (req, res) => {
    try {
        const userId = req.session.user && req.session.user._id;
        const { friendId } = req.body;
        await userService.removeFriend(userId, friendId);
        res.json({ success: true });
    } catch (e) { console.error(e); res.json({ error: e.message || 'Lỗi' }); }
};
