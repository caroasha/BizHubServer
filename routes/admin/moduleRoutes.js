const router = require('express').Router();
const { getByTenant, enable, disable, updateFeatures } = require('../../controllers/admin/moduleController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/tenant/:tenantId', getByTenant);
router.post('/enable', enable);
router.post('/disable', disable);
router.put('/features', updateFeatures);

module.exports = router;