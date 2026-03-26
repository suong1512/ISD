const express = require('express');
const router = express.Router({ mergeParams: true });
const attachmentController = require('../controllers/attachmentController');
const upload = require('../config/multer');

router.post('/', upload.single('file'), attachmentController.addOrderAttachment);

module.exports = router;