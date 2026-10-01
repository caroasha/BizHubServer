const router = require('express').Router();
const { login, logout, refreshToken, getProfile, updateProfile, changePassword, forgotPassword, resetPassword } = require('../../controllers/admin/authController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');
const { authLimiter } = require('../../middleware/global/rateLimiter');

router.post('/login', authLimiter, login);
router.post('/logout', superAdminAuth, logout);
router.post('/refresh', refreshToken);
router.get('/profile', superAdminAuth, getProfile);
router.put('/profile', superAdminAuth, updateProfile);
router.put('/change-password', superAdminAuth, changePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;