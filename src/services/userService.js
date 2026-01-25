const User = require('../models/User');

exports.getById = async (id) => {
    // trả về user có populated friends & groups
    return User.findById(id).populate('friends', 'username avatar').populate('groups', 'name');
};

exports.updateProfile = async ({ userId, avatar, username } = {}) => {
    if (!userId) throw new Error('Missing userId');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (typeof avatar === 'string' && avatar.trim()) {
        user.avatar = avatar.trim();
    }

    if (typeof username === 'string' && username.trim() && username.trim() !== user.username) {
        const now = Date.now();
        const last = user.lastUsernameChangedAt ? new Date(user.lastUsernameChangedAt).getTime() : 0;
        const limit = 30 * 24 * 60 * 60 * 1000;
        if (now - last < limit) {
            const e = new Error('Username chỉ được đổi sau 30 ngày');
            e.status = 400;
            throw e;
        }
        user.username = username.trim();
        user.lastUsernameChangedAt = new Date();
    }

    await user.save();
    return user;
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
