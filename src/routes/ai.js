const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/suggest', aiController.suggest);
router.post('/reply', aiController.reply);

module.exports = router;
