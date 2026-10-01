const router = require('express').Router();
const ctrl = require('../../controllers/admin/approvalController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', ctrl.getAll);
router.get('/new', ctrl.getNew);
router.get('/renewals', ctrl.getRenewals);
router.get('/upgrades', ctrl.getUpgrades);
router.get('/stats', ctrl.getStats);

router.put('/:id/approve', ctrl.approve);
router.put('/:id/reject', ctrl.reject);
router.put('/:id/confirm-payment', ctrl.confirmPayment);
router.delete('/:id', ctrl.deleteApproval);
router.post('/bulk-approve', ctrl.bulkApprove);

module.exports = router;