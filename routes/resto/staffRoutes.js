const router = require('express').Router();
const staffController = require('../../controllers/resto/staffController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get staff stats
router.get('/stats', staffController.getStats);

// CRUD operations
router.get('/', staffController.getAll);
router.get('/:id', staffController.getById);
router.post('/', staffController.create);
router.put('/:id', staffController.update);
router.delete('/:id', staffController.remove);

// Password management
router.patch('/:id/password', staffController.changePassword);

// Toggle status
router.patch('/:id/toggle', staffController.toggleStatus);

module.exports = router;