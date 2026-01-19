const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Page
router.get('/', homeController.index);
router.get('/chat', homeController.chat);

module.exports = router;
