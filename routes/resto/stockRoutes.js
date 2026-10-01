const router = require('express').Router();
const stockController = require('../../controllers/resto/stockController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get low stock items
router.get('/low-stock', stockController.getLowStock);

// Get expiring soon items
router.get('/expiring', stockController.getExpiringSoon);

// Get stock stats
router.get('/stats', stockController.getStats);

// CRUD operations
router.get('/', stockController.getAll);
router.get('/:id', stockController.getById);
router.post('/', stockController.create);
router.put('/:id', stockController.update);
router.delete('/:id', stockController.remove);

// Stock management
router.patch('/:id/use', stockController.recordUsage);
router.patch('/:id/add', stockController.addStock);

module.exports = router;