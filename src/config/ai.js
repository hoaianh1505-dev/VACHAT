const env = require('./environment');
module.exports = {
    getApiKey: () => env.OPENAI_API_KEY
};
