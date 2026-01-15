exports.sendMessage = async (req, res) => {
    // ...send message logic...
    res.json({ message: 'Send message endpoint' });
};

exports.getMessages = async (req, res) => {
    // ...get messages logic...
    res.json({ message: 'Get messages endpoint' });
};
