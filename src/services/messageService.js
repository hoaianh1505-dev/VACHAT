const Message = require('../models/Message');

exports.sendMessage = async (sender, receiver, content) => {
    const message = new Message({ sender, receiver, content });
    return await message.save();
};

exports.getMessages = async (userId, withUser) => {
    return await Message.find({
        $or: [
            { sender: userId, receiver: withUser },
            { sender: withUser, receiver: userId }
        ]
    }).sort({ createdAt: 1 }).lean();
};
