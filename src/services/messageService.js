const crypto = require('crypto');
const mongoose = require('mongoose');
const Message = require('../models/Message');

// AES helpers
function getAesKey() {
    const rawKey = process.env.CHAT_SECRET || 'chat_secret_key_123456';
    return crypto.createHash('sha256').update(rawKey).digest();
}
function encryptMessage(text) {
    const key = getAesKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
function decryptMessage(data) {
    const key = getAesKey();
    const [ivHex, encrypted] = String(data).split(':');
    const iv = Buffer.from(ivHex || '', 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted || '', 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

exports.createMessage = async ({ chatType, chatId, fromId, toId, content, io } = {}) => {
    if (!chatType || !chatId || !fromId || !content) throw new Error('Missing fields');
    const encrypted = encryptMessage(content);
    const convId = [String(fromId), String(chatId)].sort().join('_');
    const toObjId = chatType === 'friend' ? new mongoose.Types.ObjectId(chatId) : undefined;
    const msg = await Message.create({
        chatType,
        chatId: new mongoose.Types.ObjectId(chatId),
        conversationId: convId,
        from: new mongoose.Types.ObjectId(fromId),
        to: toObjId,
        content: encrypted
    });

    // realtime emit nếu có io
    if (io) {
        const plain = (() => { try { return decryptMessage(encrypted); } catch (e) { return '[unable to decrypt]'; } })();
        const basePayload = {
            messageId: String(msg._id),
            chat: { type: chatType, id: String(chatId), conversationId: convId },
            message: plain,
            from: String(fromId),
            to: String(chatId),
            createdAt: msg.createdAt,
            conversationId: convId
        };
        try {
            // Use single emission path: prefer io.emitToUser (central helper), else fallback to userSocketMap lookups.
            if (chatType === 'friend') {
                const payloadForSender = Object.assign({}, basePayload, { isSelf: true, chat: { type: 'friend', id: String(chatId), conversationId: convId } });
                const payloadForReceiver = Object.assign({}, basePayload, { isSelf: false, chat: { type: 'friend', id: String(fromId), conversationId: convId } });

                if (typeof io.emitToUser === 'function') {
                    io.emitToUser(String(fromId), 'chat message', payloadForSender);
                    io.emitToUser(String(chatId), 'chat message', payloadForReceiver);
                } else if (io.userSocketMap) {
                    const sidFrom = io.userSocketMap[String(fromId)];
                    const sidTo = io.userSocketMap[String(chatId)];
                    if (sidFrom) io.to(sidFrom).emit('chat message', payloadForSender);
                    if (sidTo) io.to(sidTo).emit('chat message', payloadForReceiver);
                }
            } else if (chatType === 'group') {
                const payloadForSender = Object.assign({}, basePayload, { isSelf: true });
                const payloadForGroup = Object.assign({}, basePayload, { isSelf: false });

                // sender: try emitToUser/fallback once
                if (typeof io.emitToUser === 'function') {
                    io.emitToUser(String(fromId), 'chat message', payloadForSender);
                } else if (io.userSocketMap && io.userSocketMap[String(fromId)]) {
                    io.to(io.userSocketMap[String(fromId)]).emit('chat message', payloadForSender);
                }
                // broadcast to group room (single broadcast)
                if (io && typeof io.to === 'function') {
                    io.to(`group_${String(chatId)}`).emit('chat message', payloadForGroup);
                }
            }
        } catch (e) {
            console.warn('messageService emit failed', e);
        }
    }

    return msg;
};

exports.getMessages = async ({ userId, chatType, chatId } = {}) => {
    if (!userId || !chatType || !chatId) return [];
    const convId = [String(userId), String(chatId)].sort().join('_');

    const ObjectId = mongoose.Types.ObjectId;
    // allow either conversationId match (legacy) or explicit chatType+chatId match
    const q = {
        $or: [
            { conversationId: convId },
            { chatType, chatId: new ObjectId(chatId) }
        ]
    };

    const messages = await Message.find(q).sort({ createdAt: 1 });

    // mark read
    const unreadIds = messages.filter(m => !m.readBy || !m.readBy.includes(userId)).map(m => m._id);
    if (unreadIds.length) {
        await Message.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: userId } });
    }

    // decrypt safe
    return messages.map(m => {
        let plain = '[unable to decrypt]';
        try { plain = decryptMessage(m.content); } catch (e) { /* ignore */ }
        return {
            _id: m._id,
            from: m.from,
            to: m.to,
            content: plain,
            createdAt: m.createdAt,
            isSelf: String(m.from) === String(userId),
            readBy: m.readBy || []
        };
    });
};

exports.markRead = async ({ messageIds = [], userId } = {}) => {
    if (!messageIds.length || !userId) return;
    await Message.updateMany({ _id: { $in: messageIds } }, { $addToSet: { readBy: userId } });
};

exports.listConversations = async ({ userId } = {}) => {
    if (!userId) return [];
    const convs = await Message.aggregate([
        { $match: { $or: [{ from: mongoose.Types.ObjectId(userId) }, { to: mongoose.Types.ObjectId(userId) }] } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$conversationId', lastMsg: { $first: '$$ROOT' } } },
        { $project: { conversationId: '$_id', lastMessage: '$lastMsg' } }
    ]);

    // decrypt lastMessage.content safely
    return convs.map(c => {
        let plain = '[unable to decrypt]';
        try { plain = decryptMessage(c.lastMessage.content); } catch (e) { /* ignore */ }
        return {
            conversationId: c.conversationId,
            lastMessage: {
                _id: c.lastMessage._id,
                from: c.lastMessage.from,
                to: c.lastMessage.to,
                content: plain,
                createdAt: c.lastMessage.createdAt
            }
        };
    });
};

exports.deleteConversation = async ({ userId, chatType, chatId, io } = {}) => {
    if (!userId || !chatType || !chatId) throw new Error('Missing fields');
    const convId = [String(userId), String(chatId)].sort().join('_');

    const mongoose = require('mongoose');
    const ObjectId = mongoose.Types.ObjectId;

    // build query: prefer conversationId match, fallback to chatType+chatId for compatibility
    const q = {
        $or: [
            { conversationId: convId },
            { chatType, chatId: new ObjectId(chatId) }
        ]
    };

    try {
        const res = await Message.deleteMany(q);
        // emit realtime notification to participants (best-effort) - avoid double emit
        try {
            if (io && typeof io.emitToUser === 'function') {
                io.emitToUser(userId, 'conversation-deleted', { chatType, chatId });
                if (chatType === 'friend') io.emitToUser(String(chatId), 'conversation-deleted', { chatType, chatId });
                if (chatType === 'group' && io && typeof io.to === 'function') io.to(`group_${chatId}`).emit('conversation-deleted', { chatType, chatId });
            } else if (io && io.userSocketMap) {
                const sidReq = io.userSocketMap[String(userId)];
                if (sidReq) io.to(sidReq).emit('conversation-deleted', { chatType, chatId });
                if (chatType === 'friend') {
                    const sidOther = io.userSocketMap[String(chatId)];
                    if (sidOther) io.to(sidOther).emit('conversation-deleted', { chatType, chatId });
                }
                if (chatType === 'group' && io && typeof io.to === 'function') io.to(`group_${chatId}`).emit('conversation-deleted', { chatType, chatId });
            }
        } catch (e) { console.warn('emit conversation-deleted failed', e); }
        return { deletedCount: res.deletedCount || 0 };
    } catch (e) {
        throw e;
    }
};

exports.deleteMessage = async ({ userId, messageId, io } = {}) => {
    if (!userId || !messageId) throw new Error('Missing fields');
    const msg = await Message.findById(messageId).lean();
    if (!msg) {
        const e = new Error('Message not found');
        e.status = 404;
        throw e;
    }
    if (String(msg.from) !== String(userId)) {
        const e = new Error('Forbidden');
        e.status = 403;
        throw e;
    }
    const res = await Message.deleteOne({ _id: msg._id });

    try {
        const payload = { messageId: String(msg._id), chatType: msg.chatType, chatId: String(msg.chatId) };
        if (io && typeof io.emitToUser === 'function') {
            io.emitToUser(String(userId), 'message-deleted', payload);
            if (msg.chatType === 'friend') {
                const otherId = String(msg.to || msg.chatId);
                io.emitToUser(otherId, 'message-deleted', payload);
            }
            if (msg.chatType === 'group' && typeof io.to === 'function') {
                io.to(`group_${String(msg.chatId)}`).emit('message-deleted', payload);
            }
        } else if (io && io.userSocketMap) {
            const sid = io.userSocketMap[String(userId)];
            if (sid) io.to(sid).emit('message-deleted', payload);
            if (msg.chatType === 'friend') {
                const otherId = String(msg.to || msg.chatId);
                const sidOther = io.userSocketMap[otherId];
                if (sidOther) io.to(sidOther).emit('message-deleted', payload);
            }
            if (msg.chatType === 'group' && typeof io.to === 'function') {
                io.to(`group_${String(msg.chatId)}`).emit('message-deleted', payload);
            }
        }
    } catch (e) {
        console.warn('emit message-deleted failed', e);
    }

    return { deletedCount: res.deletedCount || 0 };
};
