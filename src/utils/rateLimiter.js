// ...new file...
exports.attachRateLimiter = (socket, { capacity = 10, refillWindowMs = 10000 } = {}) => {
    if (!socket) return;
    socket._rate = { capacity, tokens: capacity, last: Date.now(), window: refillWindowMs };
    socket.canSend = function (cost = 1) {
        const now = Date.now();
        const elapsed = now - (socket._rate.last || now);
        if (elapsed > 0) {
            const intervals = Math.floor(elapsed / socket._rate.window);
            if (intervals > 0) {
                const refill = intervals * socket._rate.capacity;
                socket._rate.tokens = Math.min(socket._rate.capacity, (socket._rate.tokens || socket._rate.capacity) + refill);
                socket._rate.last = now;
            }
        }
        socket._rate.last = socket._rate.last || now;
        if ((socket._rate.tokens || 0) >= cost) {
            socket._rate.tokens -= cost;
            return true;
        }
        return false;
    };
};
