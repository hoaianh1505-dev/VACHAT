const mongooseSafe = (() => {
    try { return require('mongoose'); } catch (e) { return null; }
})();

module.exports = async function startup(server, io, env, db, app) {
    // global error handlers
    process.on('unhandledRejection', (reason, p) => {
        console.error('Unhandled Rejection at:', p, 'reason:', reason);
    });
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
    });

    const PORT = env.PORT || process.env.PORT || 3000;

    // connect DB (let errors propagate instead of swallowing them)
    await db.connect();
    console.log('MongoDB connected');

    // show whether Gemini key configured (non-sensitive)
    if (env.GEMINI_API_KEY) console.log('Gemini API key: configured');
    else console.log('Gemini API key: NOT configured — AI will fallback to local generator.');

    // start http server
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`App link: http://localhost:${PORT}`);
        if (env.FRONTEND_URL) console.log('Allowed frontend origin (CORS/SocketIO):', env.FRONTEND_URL);
    });

    // graceful shutdown helper
    const shutdown = async (signal) => {
        try {
            console.log(`Received ${signal}. Shutting down gracefully...`);
            // stop accepting new connections
            server.close(() => console.log('HTTP server closed'));
            // close socket.io
            try { if (io && io.close) io.close(); } catch (e) { console.warn('Failed to close io', e); }
            // close mongoose if available and connected
            try {
                if (mongooseSafe && mongooseSafe.connection && mongooseSafe.connection.readyState === 1) {
                    await mongooseSafe.disconnect();
                    console.log('MongoDB disconnected');
                }
            } catch (e) { console.warn('Error disconnecting mongoose', e); }
            // give some time then exit
            setTimeout(() => process.exit(0), 1000);
        } catch (e) {
            console.error('Error during shutdown', e);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
};
