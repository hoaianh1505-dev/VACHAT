const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '/public/avatar.png' }, // link ảnh đại diện
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    lastActive: { type: Date, default: null },
    lastUsernameChangedAt: { type: Date, default: null }
});
module.exports = mongoose.model('User', UserSchema);
