const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// delegate rendering to controller
router.get('/login', loginController.showLogin);
router.get('/register', loginController.showRegister);

module.exports = router;
