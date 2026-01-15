const mongoose = require('mongoose');

const AIUserSchema = new mongoose.Schema({
    name: { type: String, default: 'AI Bot' },
    avatar: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIUser', AIUserSchema);