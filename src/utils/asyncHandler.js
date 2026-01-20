/**
 * Async handler wrapper to catch errors and pass them to next()
 * Eliminates the need for try-catch blocks in every controller
 */
module.exports = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
