exports.register = (req, res, next) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.render('register', { error: 'Missing fields' });
    // Đơn giản kiểm tra email hợp lệ
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.render('register', { error: 'Invalid email' });
    next();
};

// login: validate email instead of username
exports.login = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return res.render('login', { error: 'Missing fields' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) return res.render('login', { error: 'Invalid email' });
    next();
};
