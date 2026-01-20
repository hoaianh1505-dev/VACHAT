const { isEmail } = require('../utils/validation');

exports.register = (req, res, next) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.render('register', { error: 'Missing fields' });
    // Validate email using shared helper
    if (!isEmail(email)) return res.render('register', { error: 'Invalid email' });
    next();
};

// login: validate email instead of username
exports.login = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return res.render('login', { error: 'Missing fields' });
    if (!isEmail(email)) return res.render('login', { error: 'Invalid email' });
    next();
};
