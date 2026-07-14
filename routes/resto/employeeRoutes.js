const router = require('express').Router();
const employeeController = require('../../controllers/resto/employeeController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get employee stats
router.get('/stats', employeeController.getStats);

// CRUD operations
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.remove);

// Status management
router.patch('/:id/status', employeeController.updateStatus);

module.exports = router;