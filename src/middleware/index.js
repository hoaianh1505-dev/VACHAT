const logger = require('../utils/logger');
const cors = require('./cors');
const errorHandler = require('./errorHandler');
const auth = require('./auth');
const validation = require('./validation');

// simple request logger middleware
function requestLogger(req, res, next) {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.originalUrl}`);
    next();
}

module.exports = {
    requestLogger,
    cors,
    errorHandler,
    auth,
    validation
};
