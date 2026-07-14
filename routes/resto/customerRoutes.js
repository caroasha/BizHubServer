const router = require('express').Router();
const customerController = require('../../controllers/resto/customerController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get customer stats
router.get('/stats', customerController.getStats);

// Get customer by phone
router.get('/phone/:phone', customerController.getByPhone);

// CRUD operations
router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

module.exports = router;