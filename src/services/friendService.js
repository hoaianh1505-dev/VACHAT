const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

exports.searchUser = async (sessionUserId, username) => {
    if (!sessionUserId) throw new Error('Not authenticated');
    const user = await User.findOne({ username: username.trim() });
    if (!user) return null;
    if (String(user._id) === String(sessionUserId)) return { self: true };
    const me = await User.findById(sessionUserId);
    if (me.friends && me.friends.some(f => f.equals(user._id))) return { alreadyFriend: true };
    const exist = await FriendRequest.findOne({ from: sessionUserId, to: user._id, status: 'pending' });
    return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        pending: !!exist
    };
};

exports.createRequest = async ({ fromId, toId, io } = {}) => {
    if (!fromId || !toId) throw new Error('Missing ids');
    const exist = await FriendRequest.findOne({ from: fromId, to: toId, status: 'pending' });
    if (exist) return exist;
    const reqDoc = await FriendRequest.create({ from: fromId, to: toId, status: 'pending' });
    // realtime
    if (io && io.userSocketMap && io.userSocketMap[String(toId)]) {
        const fromUser = await User.findById(fromId).select('_id username avatar');
        io.to(io.userSocketMap[String(toId)]).emit('friend-request', { toId, fromUser });
    }
    return reqDoc;
};

exports.cancelRequest = async ({ fromId, toId } = {}) => {
    if (!fromId || !toId) throw new Error('Missing ids');
    await FriendRequest.deleteOne({ from: fromId, to: toId, status: 'pending' });
};

exports.pendingFor = async (userId) => {
    if (!userId) return [];
    return FriendRequest.find({ to: userId, status: 'pending' }).populate('from', 'username avatar');
};

exports.acceptRequest = async ({ requestId, userId, io } = {}) => {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== String(userId)) throw new Error('Invalid request');
    request.status = 'accepted';
    await request.save();
    // add friends both sides
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    // emit to sender
    if (io && io.userSocketMap) {
        const accepter = await User.findById(request.to).select('_id username avatar');
        const senderId = String(request.from);
        if (io.userSocketMap[senderId]) {
            io.to(io.userSocketMap[senderId]).emit('friend-accepted', {
                toId: senderId,
                fromUser: { _id: String(accepter._id), username: accepter.username, avatar: accepter.avatar }
            });
        }
    }
    return request;
};

exports.rejectRequest = async ({ requestId, userId } = {}) => {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== String(userId)) throw new Error('Invalid request');
    request.status = 'rejected';
    await request.save();
    return request;
};
