const router = require('express').Router();
const { initiateMpesaPayment, checkPaymentStatus } = require('../../controllers/public/paymentController');
const { mpesaLimiter } = require('../../middleware/global/rateLimiter');

router.post('/mpesa', mpesaLimiter, initiateMpesaPayment);
router.get('/mpesa/:checkoutRequestId', checkPaymentStatus);

module.exports = router;