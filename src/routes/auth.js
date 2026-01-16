const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/register', (req, res) => {
    res.render('register'); // src/view/register.ejs
});

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
