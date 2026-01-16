require('dotenv').config();
module.exports = {
    PORT: process.env.PORT || 3000,
    MONGO_URI: process.env.MONGO_URI || '',
    CHAT_SECRET: process.env.CHAT_SECRET || 'chat_secret_key_123456',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
};
