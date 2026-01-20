const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const middleware = require('../middleware');

router.get('/', homeController.index);
router.get('/chat', middleware.auth, homeController.chat);

module.exports = router;
