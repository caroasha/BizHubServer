const router = require('express').Router();
const { getAll, getById, disable, enable, resetPassword } = require('../../controllers/admin/userController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/:id', getById);
router.put('/:id/disable', disable);
router.put('/:id/enable', enable);
router.put('/:id/reset-password', resetPassword);

module.exports = router;