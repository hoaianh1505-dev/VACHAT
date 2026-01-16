const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

router.get('/search-user', friendController.searchUser);
router.post('/add-friend', friendController.addFriend);
router.get('/pending', friendController.pendingFriendRequests);
router.post('/accept', friendController.acceptFriendRequest);
router.post('/reject', friendController.rejectFriendRequest);
router.post('/remove', friendController.removeFriend);

module.exports = router;
