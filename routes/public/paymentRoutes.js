const router = require('express').Router();
const ctrl = require('../../controllers/public/paymentController');
const { mpesaLimiter, generalLimiter } = require('../../middleware/global/rateLimiter');

router.get('/methods', generalLimiter, ctrl.getPaymentMethods);
router.post('/stk', mpesaLimiter, ctrl.sendStkForInvoice);
router.get('/stk/:checkoutRequestId/status', generalLimiter, ctrl.checkStkStatus);
router.get('/invoice/:invoiceNumber', generalLimiter, ctrl.getInvoiceByNumber);
router.get('/mpesa/config', generalLimiter, ctrl.checkMpesaConfig);

module.exports = router;