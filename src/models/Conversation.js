const mongoose = require('mongoose');
const ConversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    updatedAt: { type: Date, default: Date.now }
});
// Deprecated placeholder for Conversation model (kept to avoid accidental requires).
module.exports = {
    deprecated: true,
    note: 'Conversation model deprecated — legacy schema placeholder.'
};
