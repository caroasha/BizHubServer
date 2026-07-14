const router = require('express').Router();
const { login, logout, refreshToken, forgotPassword, resetPassword } = require('../../controllers/public/authController');
const { authLimiter } = require('../../middleware/global/rateLimiter');

router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;