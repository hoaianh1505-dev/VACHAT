const middleware = require('../middleware');

/**
 * Central routing configuration
 * @param {Express} app - Express application instance
 */
function setupRoutes(app) {
    // Page routes (Home, Chat)
    app.use('/', require('../routes/home'));

    // Authentication routes (Login, Register, Logout)
    app.use('/', require('../routes/auth'));

    // API routes (prefixed with /api)
    app.use('/api', require('../routes/api'));

    // Global Error Handler (must be last)~
    app.use(middleware.errorHandler);
}

module.exports = setupRoutes;
