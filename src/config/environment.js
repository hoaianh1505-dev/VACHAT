require('dotenv').config();
module.exports = {
    PORT: process.env.PORT || 3000,
    MONGO_URI: process.env.MONGO_URI || '',
    CHAT_SECRET: process.env.CHAT_SECRET || 'chat_secret_key_123456',
    SESSION_SECRET: process.env.SESSION_SECRET || 'your_secret_key',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    FORCE_LOCAL_AI: (process.env.FORCE_LOCAL_AI === '1' || process.env.FORCE_LOCAL_AI === 'true') || false,
    // Service account support for Generative Language API
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '', // path to JSON key file
    SERVICE_ACCOUNT_JSON: process.env.SERVICE_ACCOUNT_JSON || '', // raw JSON string alternative
    GCP_PROJECT: process.env.GCP_PROJECT || ''
};
