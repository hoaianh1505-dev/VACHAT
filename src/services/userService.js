const User = require('../models/User');

exports.getById = async (id) => {
    // trả về user có populated friends & groups
    return User.findById(id).populate('friends', 'username avatar').populate('groups', 'name');
};

exports.findByUsername = async (username) => {
    if (!username) return null;
    return User.findOne({ username: username.trim() }).select('_id username avatar email');
};

exports.list = async (filter = {}) => {
    return User.find(filter).select('_id username avatar');
};

exports.addFriend = async (userId, friendId) => {
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $addToSet: { friends: userId } });
};

exports.removeFriend = async (userId, friendId) => {
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
};
