const env = require('../config/environment');

module.exports = (req, res, next) => {
    const origin = env.FRONTEND_URL || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    // if a specific FRONTEND_URL is set we allow credentials
    if (env.FRONTEND_URL) {
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
        return res.sendStatus(200);
    }
    next();
};
