const express = require('express');
const router = express.Router();

// API root + health
router.get('/', (req, res) => res.json({ success: true, name: 'AVChat API', version: '1.0.0' }));
router.get('/status', (req, res) => res.json({ ok: true, ts: Date.now() }));

// mount sub-routers (keep paths consistent with existing controllers)
router.use('/users', require('./users'));
router.use('/messages', require('./messages'));
router.use('/groups', require('./groups'));
router.use('/friends', require('./friends'));
router.use('/conversations', require('./conversations'));

module.exports = router;
