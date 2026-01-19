const messageService = require('./messageService');

exports.listForUser = async ({ userId } = {}) => {
    if (!userId) return [];
    return messageService.listConversations({ userId });
};

exports.deleteForUser = async ({ userId, chatType, chatId, io } = {}) => {
    if (!userId || !chatType || !chatId) throw new Error('Missing fields');
    return messageService.deleteConversation({ userId, chatType, chatId, io });
};
