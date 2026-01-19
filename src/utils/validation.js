const mongoose = require('mongoose');

exports.isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
exports.isNonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
exports.isObjectId = (id) => {
    try {
        return mongoose.Types.ObjectId.isValid(String(id));
    } catch (e) {
        return false;
    }
};

exports.isStrongPassword = (p) => {
    // minimal: length >= 6
    if (!p) return false;
    return String(p).length >= 6;
};

exports.sanitizeUsername = (u) => {
    if (!u) return '';
    return String(u || '').trim().replace(/\s+/g, ' ').slice(0, 32);
};
