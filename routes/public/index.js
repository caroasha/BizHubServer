const router = require('express').Router();
const { getPublicSettings } = require('../../controllers/admin/aiSettingsController');
const Settings = require('../../models/admin/Settings');
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

// Downloads endpoint
router.get('/downloads', async (req, res) => {
  try {
    const settings = await Settings.find({ category: 'downloads' }).lean();
    const data = {};
    settings.forEach(s => { data[s.key] = s.value; });
    res.json({ success: true, data });
  } catch {
    res.json({ success: true, data: {} });
  }
});

module.exports = router;