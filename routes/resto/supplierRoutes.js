const router = require('express').Router();
const supplierController = require('../../controllers/resto/supplierController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get supplier stats
router.get('/stats', supplierController.getStats);

// CRUD operations
router.get('/', supplierController.getAll);
router.get('/:id', supplierController.getById);
router.post('/', supplierController.create);
router.put('/:id', supplierController.update);
router.delete('/:id', supplierController.remove);

// Toggle status
router.patch('/:id/toggle', supplierController.toggleStatus);

module.exports = router;