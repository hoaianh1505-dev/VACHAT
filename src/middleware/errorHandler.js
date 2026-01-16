module.exports = (err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    const status = err.status || 500;
    // API / XHR trả JSON
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(status).json({ success: false, error: err.message || 'Internal Server Error' });
    }
    // Render trang lỗi
    res.status(status);
    res.render('error', { message: err.message || 'Internal Server Error' });
};