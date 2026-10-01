const router = require('express').Router();
const { getSettings, updateSettings } = require('../../controllers/admin/paymentMethodController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;