const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

exports.register = async ({ username, email, password }) => {
    if (!username || !email || !password) {
        const e = new Error('Vui lòng điền đầy đủ thông tin');
        e.status = 400;
        throw e;
    }
    if (mongoose.connection.readyState !== 1) {
        const e = new Error('Database not connected — set MONGO_URI in .env and restart the server');
        e.status = 500;
        throw e;
    }
    const hash = await bcrypt.hash(password, 10);
    const existUser = await User.findOne({ username });
    if (existUser) throw new Error('Username already exists');
    const existEmail = await User.findOne({ email });
    if (existEmail) throw new Error('Email already exists');
    await User.create({ username, email, password: hash });
};

exports.login = async ({ email, password }) => {
    if (mongoose.connection.readyState !== 1) {
        const e = new Error('Database not connected — set MONGO_URI in .env and restart the server');
        e.status = 500;
        throw e;
    }
    // find by email (login bằng email)
    const user = await User.findOne({ email: String(email || '').trim() });
    if (!user) throw new Error('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error('Invalid credentials');
    return user; // Trả về user để lưu vào session
};
