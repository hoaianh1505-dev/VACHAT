const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);

module.exports = router;
