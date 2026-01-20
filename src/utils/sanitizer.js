// ...new file...
exports.sanitizeText = (t, opts = {}) => {
    // minimal sanitize: trim and enforce max length
    if (!t) return '';
    const max = typeof opts.max === 'number' ? opts.max : 2000;
    const s = String(t).trim();
    return s.length > max ? s.slice(0, max) : s;
};
