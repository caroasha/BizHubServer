const router = require('express').Router();
const reservationController = require('../../controllers/resto/reservationController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get today's reservations
router.get('/today', reservationController.getToday);

// Get reservation stats
router.get('/stats', reservationController.getStats);

// CRUD operations
router.get('/', reservationController.getAll);
router.get('/:id', reservationController.getById);
router.post('/', reservationController.create);

// Status management
router.patch('/:id/status', reservationController.updateStatus);
router.patch('/:id/cancel', reservationController.cancel);

module.exports = router;