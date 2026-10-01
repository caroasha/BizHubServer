const router = require('express').Router();
const expenseController = require('../../controllers/resto/expenseController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get expense stats
router.get('/stats', expenseController.getStats);

// CRUD operations
router.get('/', expenseController.getAll);
router.get('/:id', expenseController.getById);
router.post('/', expenseController.create);
router.delete('/:id', expenseController.remove);

module.exports = router;