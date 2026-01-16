const mongoose = require('mongoose');
const env = require('./environment');

exports.connect = async () => {
    if (!env.MONGO_URI) {
        console.warn('MONGO_URI not set');
        return Promise.resolve();
    }
    return mongoose.connect(env.MONGO_URI, {
        // tùy chọn mặc định; thêm nếu cần
    });
};
