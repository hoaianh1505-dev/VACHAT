const { attachRateLimiter } = require('../utils/rateLimiter');

const userSocket = require('./userSocket');
const messageSocket = require('./messageSocket');
const groupSocket = require('./groupSocket');
const friendSocket = require('./friendSocket');

module.exports = (io) => {
    // central map: userId -> socketId | [socketId,...]
    io.userSocketMap = io.userSocketMap || {};

    // helper: emit to all sockets of a userId
    io.emitToUser = function (userId, event, payload) {
        if (!userId) return;
        const key = String(userId);
        const entry = io.userSocketMap[key];
        if (!entry) return;
        const send = sid => { try { io.to(sid).emit(event, payload); } catch (e) { /* noop */ } };
        if (Array.isArray(entry)) entry.forEach(send); else send(entry);
    };

    function registerSocketForUser(userId, sid) {
        if (!userId || !sid) return;
        const key = String(userId);
        const prev = io.userSocketMap[key];
        if (!prev) io.userSocketMap[key] = sid;
        else if (Array.isArray(prev)) {
            if (!prev.includes(sid)) prev.push(sid);
        } else if (prev !== sid) {
            io.userSocketMap[key] = [prev, sid];
        }
    }

    function unregisterSocketId(sid) {
        if (!sid) return;
        for (const k of Object.keys(io.userSocketMap)) {
            const v = io.userSocketMap[k];
            if (Array.isArray(v)) {
                const idx = v.indexOf(sid);
                if (idx >= 0) {
                    v.splice(idx, 1);
                    io.userSocketMap[k] = v.length === 1 ? v[0] : v;
                }
            } else if (v === sid) {
                delete io.userSocketMap[k];
            }
        }
    }

    io.on('connection', (socket) => {
        // attach reusable rate limiter
        try { attachRateLimiter(socket); } catch (e) { console.error('Socket error:', e); }

        // try register from handshake.auth.userId
        try {
            const authId = socket.handshake && socket.handshake.auth && socket.handshake.auth.userId;
            if (authId) { socket.userId = String(authId); registerSocketForUser(socket.userId, socket.id); }
        } catch (e) { console.error('Socket error:', e); }

        // allow explicit register after connect
        socket.on('register-user', (userId) => {
            try {
                if (!userId) return;
                socket.userId = String(userId);
                registerSocketForUser(socket.userId, socket.id);
            } catch (e) { console.error('Socket error:', e); }
        });

        // attach optional sub-handlers (best-effort)
        try { require('./messageSocket')(io, socket); } catch (e) { console.error('Socket error:', e); }
        try { require('./friendSocket')(io, socket); } catch (e) { console.error('Socket error:', e); }
        try { require('./groupSocket')(io, socket); } catch (e) { console.error('Socket error:', e); }
        try { require('./userSocket')(io, socket); } catch (e) { console.error('Socket error:', e); }

        socket.on('disconnect', () => {
            unregisterSocketId(socket.id);
        });
    });
};
