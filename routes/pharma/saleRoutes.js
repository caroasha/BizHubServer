const router = require('express').Router();
const ctrl = require('../../controllers/pharma/saleController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.get('/', ctrl.getAll);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);            // POS sale (paid)
router.post('/invoice', ctrl.createInvoice); // Invoice (draft)
router.put('/:id', ctrl.update);          // Edit invoice
router.put('/:id/pay', ctrl.markAsPaid);  // Mark invoice paid
router.put('/:id/cancel', ctrl.cancel);   // Cancel
router.post('/:id/email', ctrl.sendInvoiceEmail);

module.exports = router;