const router = require('express').Router();
const transactionController = require('../../controllers/resto/transactionController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get transaction stats
router.get('/stats', transactionController.getStats);

// CRUD operations
router.get('/', transactionController.getAll);
router.get('/:id', transactionController.getById);
router.post('/', transactionController.create);

// Print receipt
router.get('/:id/receipt', transactionController.printReceipt);

module.exports = router;