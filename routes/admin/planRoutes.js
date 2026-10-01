const router = require('express').Router();
const { getAll, getById, create, update, remove, toggle } = require('../../controllers/admin/planController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.put('/:id/toggle', toggle);

module.exports = router;