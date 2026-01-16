const User = require('../models/User');

// ...implement user business logic...

exports.getUserById = async (userId) => {
    return await User.findById(userId).lean();
};
