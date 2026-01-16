const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

router.post('/request', friendController.sendFriendRequest);
router.post('/accept', friendController.acceptFriendRequest);

module.exports = router;
