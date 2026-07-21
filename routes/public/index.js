const router = require('express').Router();
const { getPublicSettings } = require('../../controllers/admin/aiSettingsController');
const { getPublicMethods } = require('../../controllers/admin/paymentMethodController');

router.use('/auth', require('./authRoutes'));
router.use('/registration', require('./registrationRoutes'));
router.use('/landing', require('./landingRoutes'));
router.use('/plans', require('./plansRoutes'));
router.use('/payment', require('./paymentRoutes'));
router.use('/renewal', require('./renewalRoutes'));
router.use('/webhooks', require('./webhookRoutes'));
router.use('/site', require('./siteSettingsRoutes'));
router.use('/legal', require('./legalRoutes'));
router.get('/ai-settings', getPublicSettings);
router.get('/payment-methods', getPublicMethods);

module.exports = router;