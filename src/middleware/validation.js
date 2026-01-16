exports.register = (req, res, next) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.render('register', { error: 'Missing fields' });
    // Đơn giản kiểm tra email hợp lệ
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.render('register', { error: 'Invalid email' });
    next();
};

exports.login = (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) return res.render('login', { error: 'Missing fields' });
    next();
};
