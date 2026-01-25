const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname || '').toLowerCase();
		const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
		cb(null, name);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))) return cb(null, true);
		return cb(new Error('Invalid file type'));
	}
});

router.post('/send-message', messageController.sendMessage);
router.post('/upload', (req, res, next) => {
	upload.single('file')(req, res, (err) => {
		if (err) {
			if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'File lớn hơn 5mb' });
			return res.status(400).json({ success: false, error: 'Upload thất bại' });
		}
		next();
	});
}, messageController.uploadMessage);
router.get('/', messageController.getMessages);
router.post('/delete-conversation', messageController.deleteConversation);

module.exports = router;
