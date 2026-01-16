module.exports = (req, res, next) => {
    // simple session-based auth
    if (req.session && req.session.user) return next();
    // for API calls prefer 401
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/login');
};
