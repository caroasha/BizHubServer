const router = require('express').Router();
const orderController = require('../../controllers/resto/orderController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get order stats
router.get('/stats', orderController.getStats);

// CRUD operations
router.get('/', orderController.getAll);
router.get('/:id', orderController.getById);
router.post('/', orderController.create);

// Status management
router.patch('/:id/status', orderController.updateStatus);
router.patch('/:id/payment', orderController.confirmPayment);
router.patch('/:id/cancel', orderController.cancel);
router.patch('/:id/dispatch', orderController.dispatch);

module.exports = router;