module.exports = (io) => {
    io.userSocketMap = io.userSocketMap || {};
    const socketHandlers = require('../socket/socketHandlers');
    socketHandlers(io);
};
