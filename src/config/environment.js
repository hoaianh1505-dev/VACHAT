require('dotenv').config();

function parseBool(v) {
    return v === '1' || v === 'true' || v === 'yes' || v === true;
}
function parseIntSafe(v, def) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
}

const raw = process.env || {};

const env = {
    PORT: parseIntSafe(raw.PORT, 3000),
    MONGO_URI: raw.MONGO_URI || '',
    CHAT_SECRET: raw.CHAT_SECRET || 'chat_secret_key_123456',
    SESSION_SECRET: raw.SESSION_SECRET || 'your_secret_key'
};

// helper accessor (safe)
env.get = (key, def) => (Object.prototype.hasOwnProperty.call(env, key) ? env[key] : (def === undefined ? null : def));

// lightweight validation helper
env.validate = () => {
    const warnings = [];
    if (!env.MONGO_URI) warnings.push('MONGO_URI not set — DB will not connect.');
    return warnings;
};

// freeze to avoid accidental mutation
Object.freeze(env);
Object.freeze(env.get);
Object.freeze(env.validate);

const warnings = env.validate();
if (warnings.length) warnings.forEach(w => console.warn('Config warning:', w));

module.exports = env;
