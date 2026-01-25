const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


router.get('/', userController.list);
router.get('/me', userController.getProfile);

module.exports = router;
