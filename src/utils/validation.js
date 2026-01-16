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
