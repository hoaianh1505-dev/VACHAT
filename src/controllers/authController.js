const authService = require('../services/authService');

exports.showLogin = (req, res) => {
    res.render('login');
};

exports.showRegister = (req, res) => {
    res.render('register');
};

exports.register = async (req, res) => {
    try {
        await authService.register(req.body);
        res.redirect('/login');
    } catch (err) {
        res.render('register', { error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const user = await authService.login(req.body);
        // Lưu user vào session (hoặc gán vào req.session.user)
        req.session.user = user;
        req.session.save(err => {
            if (err) console.warn('Session save error:', err);
            return res.redirect('/chat');
        });
    } catch (err) {
        res.render('login', { error: err.message });
    }
};
