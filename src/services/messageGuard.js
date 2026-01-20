const User = require('../models/User');
const Group = require('../models/Group');

async function ensureCanSend(userId, chatType, chatId) {
    if (!userId) throw new Error('Not authenticated');
    if (!chatType || !chatId) throw new Error('Missing chatType/chatId');

    if (chatType === 'friend') {
        const recip = await User.findById(chatId).select('_id').lean();
        if (!recip) throw new Error('Recipient not found');
        const friendship = await User.findOne({ _id: userId, friends: recip._id }).select('_id').lean();
        if (!friendship) throw new Error('Not friends');
        return true;
    } else if (chatType === 'group') {
        const g = await Group.findById(chatId).select('members').lean();
        if (!g) throw new Error('Group not found');
        if (!Array.isArray(g.members) || !g.members.map(String).includes(String(userId))) throw new Error('Not a group member');
        return true;
    }
    throw new Error('Invalid chatType');
}

module.exports = { ensureCanSend };
