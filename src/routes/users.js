const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// danh sách đơn giản
router.get('/', userController.list);
router.get('/me', userController.getProfile);

module.exports = router;
