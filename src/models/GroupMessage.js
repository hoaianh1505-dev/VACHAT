const mongoose = require('mongoose');
const GroupMessageSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
// Deprecated: GroupMessage not used in current architecture.
// Keep a minimal stub to avoid require() errors elsewhere.
module.exports = {
    deprecated: true,
    note: 'GroupMessage model deprecated — messages stored in Message model (chatType: group).'
};
