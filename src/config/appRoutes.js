const middleware = require('../middleware');

/**
 * Mount all application routes
 * @param {Express} app - Express application instance
 */
function setupRoutes(app) {
    // Page routes
    app.use('/', require('../routes/home'));
    app.use('/', require('../routes/login'));
    app.use('/auth', require('../routes/auth'));

    // API routes (aggregated under /api)
    app.use('/api', require('../routes/api'));

    // Error handler (must be last)
    app.use(middleware.errorHandler);
}

module.exports = setupRoutes;
