const env = require('./environment');
module.exports = {
    getGeminiKey: () => env.GEMINI_API_KEY
};
