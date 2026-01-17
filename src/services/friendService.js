const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

exports.searchUser = async (sessionUserId, username) => {
    if (!sessionUserId) throw new Error('Not authenticated');
    const q = username.trim();
    const user = await User.findOne({ username: { $regex: q, $options: 'i' } });
    if (!user) return null;
    if (String(user._id) === String(sessionUserId)) return { self: true };
    const me = await User.findById(sessionUserId);
    if (me && me.friends && me.friends.some(f => f.equals(user._id))) return { alreadyFriend: true };
    const exist = await FriendRequest.findOne({ from: sessionUserId, to: user._id, status: 'pending' });
    return { _id: user._id, username: user.username, avatar: user.avatar, pending: !!exist };
};

exports.createRequest = async ({ fromId, toId, io } = {}) => {
    if (!fromId || !toId) throw new Error('Missing ids');
    const toUser = await User.findById(toId).select('_id username');
    if (!toUser) throw new Error('Recipient not found');
    if (String(fromId) === String(toId)) throw new Error('Cannot send request to yourself');
    const already = await FriendRequest.findOne({
        $or: [
            { from: fromId, to: toId, status: 'pending' },
            { from: toId, to: fromId, status: 'pending' }
        ]
    });
    if (already) return already;
    const areFriends = await User.findOne({ _id: fromId, friends: toId });
    if (areFriends) throw new Error('Already friends');

    const reqDoc = await FriendRequest.create({ from: fromId, to: toId, status: 'pending' });

    // realtime: include requestId and fromUser info
    if (io) {
        try {
            const fromUser = await User.findById(fromId).select('_id username avatar');
            const payload = { toId, fromUser, requestId: String(reqDoc._id) };
            if (typeof io.emitToUser === 'function') {
                io.emitToUser(toId, 'friend-request', payload);
            } else if (io.userSocketMap && io.userSocketMap[String(toId)]) {
                io.to(io.userSocketMap[String(toId)]).emit('friend-request', payload);
            }
        } catch (e) { console.warn('friendService createRequest emit failed', e); }
    }
    return reqDoc;
};

exports.cancelRequest = async ({ fromId, toId } = {}) => {
    if (!fromId || !toId) throw new Error('Missing ids');
    await FriendRequest.deleteOne({ from: fromId, to: toId, status: 'pending' });
};

exports.pendingFor = async (userId) => {
    if (!userId) return [];
    return FriendRequest.find({ to: userId, status: 'pending' }).populate('from', 'username avatar createdAt');
};

exports.acceptRequest = async ({ requestId, userId, io } = {}) => {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== String(userId)) throw new Error('Invalid request');
    request.status = 'accepted';
    await request.save();

    // add friends both sides
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });

    // load sender & accepter info
    const sender = await User.findById(request.from).select('_id username avatar');
    const accepter = await User.findById(request.to).select('_id username avatar');

    // emit to sender: their request was accepted (include accepter)
    try {
        const senderId = String(request.from);
        const accepterPayload = { toId: senderId, fromUser: { _id: String(accepter._id), username: accepter.username, avatar: accepter.avatar } };
        if (io) {
            if (typeof io.emitToUser === 'function') {
                io.emitToUser(senderId, 'friend-accepted', accepterPayload);
            } else if (io.userSocketMap && io.userSocketMap[senderId]) {
                io.to(io.userSocketMap[senderId]).emit('friend-accepted', accepterPayload);
            }
        }
    } catch (e) {
        console.warn('emit friend-accepted failed', e);
    }

    // emit to accepter: friend was added (include sender)
    try {
        const accepterId = String(request.to);
        const accepterPayload = { toId: accepterId, friend: { _id: String(sender._id), username: sender.username, avatar: sender.avatar } };
        if (io) {
            if (typeof io.emitToUser === 'function') {
                io.emitToUser(accepterId, 'friend-added', accepterPayload);
            } else if (io.userSocketMap && io.userSocketMap[accepterId]) {
                io.to(io.userSocketMap[accepterId]).emit('friend-added', accepterPayload);
            }
        }
    } catch (e) {
        console.warn('emit friend-added failed', e);
    }

    // return useful info for controller
    return { request, sender, accepter };
};

exports.rejectRequest = async ({ requestId, userId } = {}) => {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== String(userId)) throw new Error('Invalid request');
    request.status = 'rejected';
    await request.save();
    return request;
};
