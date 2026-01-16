exports.sendMessage = async (req, res) => {
    // ...future: validate & forward to service...
    res.json({ success: false, error: 'Not implemented' });
};

exports.getMessages = async (req, res) => {
    // ...future: return message history...
    res.json({ messages: [] });
};
