const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/', messageController.sendMessage);
router.get('/:groupId', messageController.getMessages);
router.post('/direct', messageController.sendDirectMessage);
router.get('/direct/:conversationId', messageController.getDirectMessages);

module.exports = router;
