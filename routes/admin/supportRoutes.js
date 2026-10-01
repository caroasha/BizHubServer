const router = require('express').Router();
const { getAll, getById, assign, respond, resolve, getStats } = require('../../controllers/admin/supportController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/stats', getStats);
router.get('/:id', getById);
router.put('/:id/assign', assign);
router.post('/:id/respond', respond);
router.put('/:id/resolve', resolve);

module.exports = router;