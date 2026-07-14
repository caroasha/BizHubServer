const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/tenants', require('./tenantRoutes'));
router.use('/approvals', require('./approvalRoutes'));
router.use('/plans', require('./planRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/subscriptions', require('./subscriptionRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/modules', require('./moduleRoutes'));
router.use('/audit', require('./auditRoutes'));
router.use('/support', require('./supportRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/landing', require('./landingRoutes'));
router.use('/ai', require('./aiRoutes'));
router.use('/ai-settings', require('./aiSettingsRoutes'));
router.use('/legal', require('./legalRoutes'));
router.use('/backups', require('./backupRoutes'));
router.use('/communication', require('./communicationRoutes'));
router.use('/payment-methods', require('./paymentMethodRoutes'));

module.exports = router;