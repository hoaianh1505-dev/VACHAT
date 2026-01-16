const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validation = require('../middleware/validation');

// Register
router.post('/register', validation.register, authController.register);

// Login
router.post('/login', validation.login, authController.login);

// Logout
router.post('/logout', (req, res) => {
    // Nếu dùng session/cookie thì xóa ở đây
    // req.session.destroy(); hoặc res.clearCookie('token');
    res.redirect('/login');
});

module.exports = router;
