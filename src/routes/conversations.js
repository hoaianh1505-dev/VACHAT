const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

// GET /api/conversations
router.get('/', conversationController.listForUser);

module.exports = router;
