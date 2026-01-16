const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');

exports.getFriendsOfUser = async (userId) => {
    const friends = await Friend.find({
        $or: [
            { user1: userId },
            { user2: userId }
        ]
    }).populate([
        { path: 'user1', select: 'username avatar' },
        { path: 'user2', select: 'username avatar' }
    ]).lean();

    return friends.map(f =>
        f.user1._id.toString() === userId.toString() ? f.user2 : f.user1
    );
};

exports.sendFriendRequest = async (from, to) => {
    const request = new FriendRequest({ from, to });
    return await request.save();
};

exports.acceptFriendRequest = async (requestId, userId) => {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') throw new Error('Invalid request');
    request.status = 'accepted';
    await request.save();
    const friend = new Friend({ user1: request.from, user2: request.to });
    return await friend.save();
};
