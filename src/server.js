const env = require('./config/environment');
const db = require('./config/database');
const socketConfig = require('./config/socket');
const setupMiddleware = require('./config/appMiddleware');
const setupRoutes = require('./config/appRoutes');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with configuration
const io = socketio(server);
socketConfig(io);

// Setup middleware (includes session, body parsers, static files, etc.)
setupMiddleware(app, io);

// Setup routes
setupRoutes(app);

// Start server
const PORT = env.PORT || 3000;

db.connect()
    .then(() => {
        console.log('MongoDB connected');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`App link: http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

module.exports = { app, server, io };
