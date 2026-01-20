const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const env = require('./environment');

/**
 * Create and configure session store
 * Uses MongoDB when MONGO_URI is configured, falls back to MemoryStore otherwise
 * @returns {Object} Session store instance
 */
function createSessionStore() {
    if (!env.MONGO_URI) {
        console.warn('MONGO_URI not set — using in-memory session store (not for production)');
        return new session.MemoryStore();
    }

    try {
        const store = MongoStore.create({ mongoUrl: env.MONGO_URI });
        console.log('Session store: MongoDB');
        return store;
    } catch (e) {
        console.warn('MongoStore.create failed, falling back to MemoryStore:', e.message || e);
        return new session.MemoryStore();
    }
}

/**
 * Get session configuration object
 * @returns {Object} Express session configuration
 */
function getSessionConfig() {
    const isProd = process.env.NODE_ENV === 'production';

    return {
        secret: env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: false,
        store: createSessionStore(),
        cookie: {
            secure: isProd,
            sameSite: 'lax'
        }
    };
}

module.exports = { createSessionStore, getSessionConfig };
