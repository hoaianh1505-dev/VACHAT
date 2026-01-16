exports.ok = (res, data = {}) => res.json(Object.assign({ success: true }, data));
exports.err = (res, message = 'Error', status = 400) => res.status(status).json({ success: false, error: message });
