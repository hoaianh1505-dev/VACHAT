const mongoose = require('mongoose');

const GroupMessageSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null nếu là AI
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isAI: { type: Boolean, default: false }
});

module.exports = mongoose.model('GroupMessage', GroupMessageSchema);