const express = require('express');
const session = require('express-session');
const path = require('path');
const middleware = require('../middleware');
const { getSessionConfig } = require('./sessionStore');

/**
 * Configure all application middleware
 * @param {Express} app - Express application instance
 * @param {SocketIO} io - Socket.IO instance
 */
function setupMiddleware(app, io) {
    // Pre-load models that need to be registered early
    require('../models/Group');

    // Attach io to app for access in routes/controllers
    app.set('io', io);

    // Body parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Static files
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // Session
    app.use(session(getSessionConfig()));

    // Trust proxy in production (if behind a proxy/load balancer)
    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1);
    }

    // Custom middleware
    app.use(middleware.requestLogger);
    app.use(middleware.cors);

    // View engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '..', 'view'));
}

module.exports = setupMiddleware;
