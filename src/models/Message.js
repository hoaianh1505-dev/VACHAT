const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
    chatType: { type: String, enum: ['friend', 'group'], required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, required: true },
    conversationId: { type: String }, // <-- thêm trường để lưu ID cuộc hội thoại cố định
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // nếu là friend
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // <--- thêm dòng này
});
module.exports = mongoose.model('Message', MessageSchema);
