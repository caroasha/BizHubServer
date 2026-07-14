const router = require('express').Router();
const { getAll, getByKey, update, bulkUpdate, remove, getFeatureFlags } = require('../../controllers/admin/settingsController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/flags', getFeatureFlags);
router.get('/:key', getByKey);
router.put('/', update);
router.post('/bulk', bulkUpdate);
router.delete('/:key', remove);

module.exports = router;