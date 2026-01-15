const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if (!username || !password || !email) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            email
        });
        await user.save();
        return res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi đăng ký.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Tài khoản không tồn tại.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu không đúng.' });
        }
        // Tạo token JWT (hoặc trả về success nếu không dùng JWT)
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'vachat_secret',
            { expiresIn: '7d' }
        );
        return res.json({ token, user: { username: user.username, email: user.email } });
    } catch (err) {
        return res.status(500).json({ message: 'Lỗi đăng nhập.' });
    }
};

exports.profile = async (req, res) => {
    // ...existing code...
};

exports.logout = async (req, res) => {
    // ...existing code...
};
