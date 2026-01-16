const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Friend = require('../models/FriendRequest'); // Model lời mời kết bạn

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

// Tìm kiếm bạn qua username (AJAX)
router.get('/search-user', async (req, res) => {
    const { username } = req.query;
    const sessionUser = req.session.user;
    if (!username || !sessionUser) return res.json({ error: 'Missing username' });
    const user = await User.findOne({ username });
    if (!user) return res.json({ error: 'Không tìm thấy user' });
    if (user._id.equals(sessionUser._id)) return res.json({ error: 'Không thể tìm chính mình' });

    // Kiểm tra đã là bạn chưa
    const me = await User.findById(sessionUser._id);
    if (me.friends && me.friends.some(f => f.equals(user._id))) {
        return res.json({ error: 'Đã là bạn bè' });
    }

    // Kiểm tra đã gửi lời mời chưa
    const Friend = require('../models/FriendRequest');
    const exist = await Friend.findOne({ from: sessionUser._id, to: user._id, status: 'pending' });
    if (exist) {
        // Trả về user, client sẽ hiển thị nút thu hồi
        return res.json({
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            pending: true
        });
    }

    // Nếu chưa gửi lời mời, vẫn trả về user để hiển thị nút gửi kết bạn
    res.json({
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        pending: false
    });
});

// Gửi lời mời kết bạn
router.post('/add-friend', async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.body;
    if (!toId || fromId === toId) return res.json({ error: 'Invalid request' });

    // Kiểm tra đã gửi chưa
    const exist = await Friend.findOne({ from: fromId, to: toId, status: 'pending' });
    if (exist) return res.json({ error: 'Đã gửi lời mời' });

    // Lưu lời mời kết bạn vào DB
    await Friend.create({ from: fromId, to: toId, status: 'pending' });

    // Gửi realtime qua socket cho bên nhận (mapping userId <-> socketId)
    const io = req.app.get('io');
    if (io && io.userSocketMap && io.userSocketMap[toId]) {
        const User = require('../models/User');
        const fromUser = await User.findById(fromId).select('_id username avatar');
        io.to(io.userSocketMap[toId]).emit('friend-request', { toId, fromUser });
    }

    res.json({ success: true });
});

// Kiểm tra trạng thái lời mời kết bạn
router.get('/check-friend-request', async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.query;
    if (!toId || fromId === toId) return res.json({ status: 'none' });
    const exist = await Friend.findOne({ from: fromId, to: toId, status: 'pending' });
    if (exist) return res.json({ status: 'pending' });
    res.json({ status: 'none' });
});

// Thu hồi lời mời kết bạn
router.post('/cancel-friend-request', async (req, res) => {
    const fromId = req.session.user._id;
    const { toId } = req.body;
    if (!toId || fromId === toId) return res.json({ error: 'Invalid request' });
    await Friend.deleteOne({ from: fromId, to: toId, status: 'pending' });
    res.json({ success: true });
});

module.exports = router;
