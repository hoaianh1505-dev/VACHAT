const config = require('../config/ai');

exports.getResponse = async (prompt) => {
    // placeholder: triển khai gọi OpenAI/AI SDK sau
    if (!prompt) return '';
    // trả về echo tạm thời
    return `Echo: ${String(prompt).slice(0, 100)}`;
};
