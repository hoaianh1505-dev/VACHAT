const mongoose = require('mongoose');
const AISuggestionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    prompt: String,
    result: String,
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AISuggestion', AISuggestionSchema);
