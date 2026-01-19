const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/send-message', messageController.sendMessage);
router.get('/', messageController.getMessages);
router.post('/delete-conversation', messageController.deleteConversation);

module.exports = router;
