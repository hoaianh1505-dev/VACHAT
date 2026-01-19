const mongoose = require('mongoose');
const FriendSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
// Deprecated placeholder for Friend model (prefer using User.friends array).
module.exports = {
    deprecated: true,
    note: 'Friend model deprecated — use User.friends or FriendRequest.'
};
