module.exports = (req, res, next) => {
    // simple session-based auth
    if (req.session && req.session.user) {
        return next();
    }

    // Redirect unauthenticated users to login
    res.redirect('/login');
};
