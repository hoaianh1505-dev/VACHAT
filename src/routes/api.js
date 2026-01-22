const express = require('express');
const router = express.Router();


// Root endpoints
router.get('/', (req, res) => res.json({ success: true, name: 'AVChat API', version: '1.0.0' }));
router.get('/status', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Sub-routers
router.use('/users', require('./users'));
router.use('/messages', require('./messages'));
router.use('/groups', require('./groups'));
router.use('/friends', require('./friends'));

module.exports = router;
