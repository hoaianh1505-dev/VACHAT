exports.sendRequest = async (req, res) => {
    // ...send friend request logic...
    res.json({ message: 'Send friend request endpoint' });
};

exports.acceptRequest = async (req, res) => {
    // ...accept friend request logic...
    res.json({ message: 'Accept friend request endpoint' });
};

exports.getFriends = async (req, res) => {
    // ...get friends logic...
    res.json({ message: 'Get friends endpoint' });
};
