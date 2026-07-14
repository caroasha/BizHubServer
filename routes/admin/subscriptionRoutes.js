const router = require('express').Router();
const { getAll, getById, getByTenant, upgrade, cancel } = require('../../controllers/admin/subscriptionController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/tenant/:tenantId', getByTenant);
router.put('/:id/upgrade', upgrade);
router.put('/:id/cancel', cancel);

module.exports = router;