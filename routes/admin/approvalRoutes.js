const router = require('express').Router();
const ctrl = require('../../controllers/admin/approvalController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/new', ctrl.getNew);
router.get('/renewals', ctrl.getRenewals);
router.put('/:id/approve', ctrl.approve);
router.put('/:id/reject', ctrl.reject);
router.post('/bulk-approve', ctrl.bulkApprove);

module.exports = router;