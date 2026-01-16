const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.register = async ({ username, email, password }) => {
    const hash = await bcrypt.hash(password, 10);
    const existUser = await User.findOne({ username });
    if (existUser) throw new Error('Username already exists');
    const existEmail = await User.findOne({ email });
    if (existEmail) throw new Error('Email already exists');
    await User.create({ username, email, password: hash });
};

exports.login = async ({ username, password }) => {
    const user = await User.findOne({ username });
    if (!user) throw new Error('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid credentials');
    return user; // Trả về user để lưu vào session
};
