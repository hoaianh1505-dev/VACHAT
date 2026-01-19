const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const friendController = require('../controllers/friendController');
const messageController = require('../controllers/messageController');

// Page
router.get('/', homeController.index);
router.get('/chat', homeController.chat);

// Friend / search
router.get('/search-user', friendController.searchUser);
router.post('/add-friend', friendController.addFriend);
router.get('/check-friend-request', friendController.checkFriendRequest);
router.post('/cancel-friend-request', friendController.cancelFriendRequest);
router.get('/pending-friend-requests', friendController.pendingFriendRequests);
router.post('/accept-friend-request', friendController.acceptFriendRequest);
router.post('/reject-friend-request', friendController.rejectFriendRequest);
router.post('/remove-friend', friendController.removeFriend);

// Messages
router.post('/send-message', messageController.sendMessage);
router.get('/messages', messageController.getMessages);
router.post('/delete-conversation', messageController.deleteConversation);

module.exports = router;
