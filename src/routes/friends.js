const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

// API endpoints under /api/friends
router.get('/search-user', friendController.searchUser);
router.post('/add-friend', friendController.addFriend);

// add missing endpoints matching previous UI expectations
router.post('/cancel-friend-request', friendController.cancelFriendRequest);
router.post('/accept-friend-request', friendController.acceptFriendRequest);
router.post('/reject-friend-request', friendController.rejectFriendRequest);
router.get('/pending-friend-requests', friendController.pendingFriendRequests);
router.get('/check-friend-request', friendController.checkFriendRequest);

router.post('/remove', friendController.removeFriend);

module.exports = router;
