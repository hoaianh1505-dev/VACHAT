const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Friend = require('../models/FriendRequest'); // Model lời mời kết bạn
const crypto = require('crypto');
const Message = require('../models/Message');

// Hàm mã hóa tin nhắn AES
function encryptMessage(text) {
    const key = process.env.CHAT_SECRET || 'chat_secret_key_123456';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf8').slice(0, 32), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decryptMessage(data) {
    const key = process.env.CHAT_SECRET || 'chat_secret_key_123456';
    const [ivHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8').slice(0, 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/chat', async (req, res) => {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.redirect('/login');
    // Lấy user và populate friends (chỉ những user đã là bạn)
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
    if (!sessionUser) return res.json({ error: 'Bạn chưa đăng nhập.' });
    if (!username || !username.trim()) return res.json({ error: 'Thiếu username.' });

    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.json({ error: 'Không tìm thấy user.' });
    if (user._id.equals(sessionUser._id)) return res.json({ error: 'Không thể tìm chính mình.' });

    // Kiểm tra đã là bạn chưa
    const me = await User.findById(sessionUser._id);
    if (me.friends && me.friends.some(f => f.equals(user._id))) {
        return res.json({ error: 'Đã là bạn bè.' });
    }

    // Kiểm tra đã gửi lời mời chưa
    const Friend = require('../models/FriendRequest');
    const exist = await Friend.findOne({ from: sessionUser._id, to: user._id, status: 'pending' });
    if (exist) {
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

// Lấy danh sách lời mời kết bạn đang chờ (bên nhận)
router.get('/pending-friend-requests', async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    if (!userId) return res.json({ requests: [] });
    const FriendRequest = require('../models/FriendRequest');
    const requests = await FriendRequest.find({ to: userId, status: 'pending' })
        .populate('from', 'username avatar');
    res.json({ requests });
});

// Chấp nhận lời mời kết bạn
router.post('/accept-friend-request', async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { requestId } = req.body;
    if (!userId || !requestId) return res.json({ error: 'Thiếu thông tin' });
    const FriendRequest = require('../models/FriendRequest');
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== userId) return res.json({ error: 'Không hợp lệ' });
    request.status = 'accepted';
    await request.save();
    // Thêm bạn vào danh sách friends của cả hai
    const User = require('../models/User');
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    res.json({ success: true });
});

// Từ chối lời mời kết bạn
router.post('/reject-friend-request', async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { requestId } = req.body;
    if (!userId || !requestId) return res.json({ error: 'Thiếu thông tin' });
    const FriendRequest = require('../models/FriendRequest');
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== userId) return res.json({ error: 'Không hợp lệ' });
    request.status = 'rejected';
    await request.save();
    res.json({ success: true });
});

// Xóa bạn
router.post('/remove-friend', async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { friendId } = req.body;
    if (!userId || !friendId) return res.json({ error: 'Thiếu thông tin' });
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
    res.json({ success: true });
});

// API gửi tin nhắn
router.post('/send-message', async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { chatType, chatId, message } = req.body;
    if (!userId || !chatType || !chatId || !message) return res.json({ error: 'Thiếu thông tin' });
    const encrypted = encryptMessage(message);
    const msg = await Message.create({
        chatType,
        chatId,
        from: userId,
        to: chatType === 'friend' ? chatId : undefined,
        content: encrypted
    });
    res.json({ success: true, message: msg });
});

// API lấy lịch sử tin nhắn
router.get('/messages', async (req, res) => {
    const userId = req.session.user && req.session.user._id;
    const { chatType, chatId } = req.query;
    if (!userId || !chatType || !chatId) return res.json({ messages: [] });
    let query = { chatType, chatId };
    if (chatType === 'friend') {
        query.$or = [
            { from: userId, to: chatId },
            { from: chatId, to: userId }
        ];
    }
    const messages = await Message.find(query).sort({ createdAt: 1 });
    // Giải mã nội dung
    const result = messages.map(m => ({
        from: m.from,
        to: m.to,
        content: decryptMessage(m.content),
        createdAt: m.createdAt,
        isSelf: m.from.toString() === userId
    }));
    res.json({ messages: result });
});

module.exports = router;
