const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String },
    avatar: { type: String },
    email: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
    // ...existing code...
});

module.exports = mongoose.model('User', UserSchema);