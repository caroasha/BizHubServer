const router = require('express').Router();
const ctrl = require('../../controllers/admin/downloadController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/toggle', ctrl.toggle);
router.delete('/:id', ctrl.remove);

module.exports = router;