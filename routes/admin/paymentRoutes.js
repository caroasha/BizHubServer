const router = require('express').Router();
const { getAll, getById, manualInvoice, refund, getStats } = require('../../controllers/admin/paymentController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/stats', getStats);
router.get('/:id', getById);
router.post('/manual', manualInvoice);
router.put('/:id/refund', refund);

module.exports = router;