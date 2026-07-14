const router = require('express').Router();
const { getAll, getById, getByTenant, getActions, getModules } = require('../../controllers/admin/auditController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/actions', getActions);
router.get('/modules', getModules);
router.get('/tenant/:tenantId', getByTenant);
router.get('/:id', getById);

module.exports = router;