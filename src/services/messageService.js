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

    // optional realtime emit nếu có io
    if (io && io.userSocketMap) {
        const plain = (() => { try { return decryptMessage(encrypted); } catch (e) { return '[unable to decrypt]'; } })();
        const payload = {
            chat: { type: chatType, id: String(chatId), conversationId: convId },
            message: plain,
            from: String(fromId),
            to: String(chatId),
            createdAt: msg.createdAt,
            conversationId: convId
        };
        try {
            // sender
            if (io.userSocketMap[String(fromId)]) {
                io.to(io.userSocketMap[String(fromId)]).emit('chat message', Object.assign({}, payload, { isSelf: true }));
            }
            // recipient
            if (chatType === 'friend' && io.userSocketMap[String(chatId)]) {
                io.to(io.userSocketMap[String(chatId)]).emit('chat message', Object.assign({}, payload, { isSelf: false }));
            }
        } catch (e) {
            // noop: fail emit doesn't break creation
            console.warn('messageService emit failed', e);
        }
    }

    return msg;
};

exports.getMessages = async ({ userId, chatType, chatId } = {}) => {
    if (!userId || !chatType || !chatId) return [];
    const convId = [String(userId), String(chatId)].sort().join('_');
    let query = { chatType, conversationId: convId };
    if (chatType === 'friend') {
        const legacyQuery = {
            chatType,
            $or: [
                { chatId, from: userId, to: chatId },
                { chatId, from: chatId, to: userId }
            ]
        };
        query = { $or: [{ chatType, conversationId: convId }, legacyQuery] };
    }
    const messages = await Message.find(query).sort({ createdAt: 1 });

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
        // emit realtime notification to participants (best-effort)
        try {
            if (io && typeof io.emitToUser === 'function') {
                // notify requester
                io.emitToUser(userId, 'conversation-deleted', { chatType, chatId });
                // if friend chat, notify other participant
                if (chatType === 'friend') io.emitToUser(String(chatId), 'conversation-deleted', { chatType, chatId });
                // groups: broadcast to group room
                if (chatType === 'group' && io.to) io.to(`group_${chatId}`).emit('conversation-deleted', { chatType, chatId });
            } else if (io && io.userSocketMap) {
                if (io.userSocketMap[String(userId)]) io.to(io.userSocketMap[String(userId)]).emit('conversation-deleted', { chatType, chatId });
                if (chatType === 'friend' && io.userSocketMap[String(chatId)]) io.to(io.userSocketMap[String(chatId)]).emit('conversation-deleted', { chatType, chatId });
                if (chatType === 'group' && io.to) io.to(`group_${chatId}`).emit('conversation-deleted', { chatType, chatId });
            }
        } catch (e) { console.warn('emit conversation-deleted failed', e); }
        return { deletedCount: res.deletedCount || 0 };
    } catch (e) {
        throw e;
    }
};
