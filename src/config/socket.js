/**
 * Socket.IO Configuration
 * Initializes Socket.IO with CORS settings and socket handlers
 */
module.exports = (io) => {
    // Configure CORS
    io.engine.opts.cors = {
        origin: true,  // Allow all origins (same-origin deployment)
        methods: ['GET', 'POST'],
        credentials: true
    };

    // Initialize socket map and handlers
    io.userSocketMap = io.userSocketMap || {};
    const socketHandlers = require('../socket/socketHandlers');
    socketHandlers(io);
};
