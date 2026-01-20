const logger = require('../utils/logger');
const cors = require('./cors');
const errorHandler = require('./errorHandler');
const auth = require('./auth');
const validation = require('./validation');
const requestLogger = require('./requestLogger'); // use single logger file

module.exports = {
    requestLogger,
    cors,
    errorHandler,
    auth,
    validation
};
