const router = require('express').Router();
const ctrl = require('../../controllers/public/invoiceController');
const { generalLimiter } = require('../../middleware/global/rateLimiter');

router.get('/:invoiceNumber', generalLimiter, ctrl.getInvoiceByNumber);
router.get('/:invoiceNumber/status', generalLimiter, ctrl.getInvoiceStatus);
router.get('/:invoiceNumber/payments', generalLimiter, ctrl.getInvoicePayments);

module.exports = router;