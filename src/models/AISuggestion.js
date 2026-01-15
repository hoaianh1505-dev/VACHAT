const mongoose = require('mongoose');

const AISuggestionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    message: { type: String },
    suggestion: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AISuggestion', AISuggestionSchema);