const router = require('express').Router();
const ctrl = require('../../controllers/public/authController');
const authenticate = require('../../middleware/global/authenticate');
const loadUser = require('../../middleware/global/loadUser');
const { authLimiter } = require('../../middleware/global/rateLimiter');

router.post('/login', authLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/refresh', authLimiter, ctrl.refreshTokenHandler);
router.get('/me', authenticate, loadUser, ctrl.getMe);

router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, ctrl.resetPassword);
router.post('/verify-email', authLimiter, ctrl.verifyEmail);
router.post('/resend-verification', authLimiter, ctrl.resendVerification);

module.exports = router;