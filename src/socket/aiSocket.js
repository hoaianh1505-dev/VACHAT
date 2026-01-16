const aiService = require('../services/aiService');

module.exports = (io, socket) => {
    socket.on('ai-query', async (data) => {
        try {
            const resp = await aiService.getResponse(data.prompt || '');
            socket.emit('ai-response', { requestId: data.requestId, result: resp });
        } catch (e) {
            socket.emit('ai-response', { requestId: data.requestId, error: e.message });
        }
    });
};
