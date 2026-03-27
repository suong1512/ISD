const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /auth/login
router.post('/login', authController.login);

// GET /auth/me?userId=...
router.get('/me', authController.getMe);

module.exports = router;
