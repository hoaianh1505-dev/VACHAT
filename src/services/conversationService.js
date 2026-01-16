const Conversation = require('../models/Conversation');

exports.createConversation = async ({ participants, messages }) => {
    const conversation = new Conversation({ participants, messages });
    return await conversation.save();
};

exports.getConversationsOfUser = async (userId) => {
    return await Conversation.find({ participants: userId }).lean();
};
