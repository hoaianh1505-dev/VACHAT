const middleware = require('../middleware');

/**
 * Mount all application routes
 * @param {Express} app - Express application instance
 */
function setupRoutes(app) {
    // Page routes
    app.use('/', require('../routes/home'));

    // Auth routes (handles /login, /register, /logout)
    const authRouter = require('../routes/auth');
    app.use('/', authRouter);

    // API routes (aggregated under /api)
    app.use('/api', require('../routes/api'));

    // Error handler (must be last)
    app.use(middleware.errorHandler);
}

module.exports = setupRoutes;
