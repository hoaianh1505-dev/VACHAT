const logger = require('../utils/logger');
const cors = require('./cors');
const errorHandler = require('./errorHandler');
const auth = require('./auth');
const validation = require('./validation');

exports.requestLogger = (req, res, next) => {
    // minimal request logging
    logger.info(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}`);
    next();
};

exports.cors = cors;
exports.errorHandler = errorHandler;
exports.auth = auth;
exports.validation = validation;
