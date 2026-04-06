const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../utils/validators');
const { uploadAvatar } = require('../middleware/upload');

// POST /api/auth/register
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login
router.post('/login', loginValidation, authController.login);

// GET /api/auth/me/permissions (authenticated)
router.get('/me/permissions', authenticate, authController.getMyPermissions);

// PUT /api/auth/profile (authenticated)
router.put('/profile', authenticate, uploadAvatar.single('avatar'), authController.updateProfile);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOTP);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
