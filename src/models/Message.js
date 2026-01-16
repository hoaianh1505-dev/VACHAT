const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
    chatType: { type: String, enum: ['friend', 'group'], required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, required: true }, // id bạn hoặc nhóm
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // nếu là friend
    content: { type: String, required: true }, // đã mã hóa
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Message', MessageSchema);
