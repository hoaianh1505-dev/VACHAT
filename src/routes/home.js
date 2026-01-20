const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const auth = require('../middleware/auth');

router.get('/', homeController.index);
router.get('/chat', auth, homeController.chat);

module.exports = router;
