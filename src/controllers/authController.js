const authService = require('../services/authService');

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const user = await authService.register(username, email, password);
        req.session.userId = user._id;
        res.redirect('/home');
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await authService.login(email, password);
        if (!user) return res.render('login', { error: 'Invalid credentials' });
        req.session.userId = user._id;
        res.redirect('/home');
    } catch (err) {
        res.render('login', { error: 'Login error' });
    }
};
