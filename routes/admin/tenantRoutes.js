const router = require('express').Router();
const { getAll, getById, update, suspend, activate, remove, getStats } = require('../../controllers/admin/tenantController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');
const { canSuspend, canDelete } = require('../../middleware/admin/tenantControl');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/stats', getStats);
router.get('/:id', getById);
router.put('/:id', update);
router.put('/:id/suspend', canSuspend, suspend);
router.put('/:id/activate', activate);
router.delete('/:id', canDelete, remove);

module.exports = router;