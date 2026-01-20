module.exports = (req, res, next) => {
    // simple session-based auth
    if (req.session && req.session.user) return next();
    // safe check for Accept header / XHR
    const acceptsJson = req.xhr || (req.headers && req.headers.accept && String(req.headers.accept).toLowerCase().includes('json'));
    if (acceptsJson) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/login');
};
