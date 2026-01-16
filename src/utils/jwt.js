const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'jwt_secret_key';

exports.sign = (payload, opts = {}) => jwt.sign(payload, secret, opts);
exports.verify = (token) => jwt.verify(token, secret);
