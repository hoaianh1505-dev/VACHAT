/**
 * Standard API response helper
 */
exports.ok = (res, data = {}) => {
    return res.status(200).json({ success: true, ...data });
};

exports.err = (res, message = 'Error', status = 500) => {
    return res.status(status).json({ success: false, error: message });
};
