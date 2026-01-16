const mongoose = require('mongoose');
const AIUserSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settings: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('AIUser', AIUserSchema);
