const router = require('express').Router();
const menuController = require('../../controllers/resto/menuController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get available menu items (for customer portal)
router.get('/available', menuController.getAvailable);

// Get menu categories
router.get('/categories', menuController.getCategories);

// Get menu stats
router.get('/stats', menuController.getStats);

// CRUD operations
router.get('/', menuController.getAll);
router.get('/:id', menuController.getById);
router.post('/', menuController.create);
router.put('/:id', menuController.update);
router.delete('/:id', menuController.remove);

// Toggle availability
router.patch('/:id/toggle', menuController.toggleAvailability);

module.exports = router;