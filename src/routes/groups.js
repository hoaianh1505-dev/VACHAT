const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.get('/', groupController.list);
router.post('/', groupController.create);
router.post('/add-member', groupController.addMember);
router.post('/remove-member', groupController.removeMember);
router.post('/delete', groupController.delete);

module.exports = router;
