const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');

router.post('/request', friendController.sendRequest);
router.post('/accept', friendController.acceptRequest);
router.get('/:userId', friendController.getFriends);

module.exports = router;
