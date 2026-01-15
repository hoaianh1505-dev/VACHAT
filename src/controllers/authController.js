const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    // ...register logic...
    res.json({ message: 'Register endpoint' });
};

exports.login = async (req, res) => {
    // ...login logic...
    res.json({ message: 'Login endpoint' });
};
