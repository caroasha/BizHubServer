const router = require('express').Router();
const { getAll, getByType, create, update, publish, archive } = require('../../controllers/admin/legalController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/:type', getByType);
router.post('/', create);
router.put('/:type', update);
router.put('/:type/publish', publish);
router.put('/:type/archive', archive);

module.exports = router;