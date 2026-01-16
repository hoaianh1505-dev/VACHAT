const isProd = process.env.NODE_ENV === 'production';

exports.info = (...args) => console.log(...args);
exports.warn = (...args) => console.warn(...args);
exports.error = (...args) => console.error(...args);
exports.debug = (...args) => { if (!isProd) console.debug(...args); };
