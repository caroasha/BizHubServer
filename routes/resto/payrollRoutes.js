const router = require('express').Router();
const payrollController = require('../../controllers/resto/payrollController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get payroll stats
router.get('/stats', payrollController.getStats);

// Get payroll by employee
router.get('/employee/:employeeId', payrollController.getByEmployee);

// Get payroll by period
router.get('/period/:period', payrollController.getByPeriod);

// Process all payrolls
router.post('/process-all', payrollController.processAll);

// Pay all pending salaries
router.post('/pay-all', payrollController.payAll);

// CRUD operations
router.get('/', payrollController.getAll);
router.get('/:id', payrollController.getById);
router.post('/', payrollController.create);
router.delete('/:id', payrollController.remove);

// Pay single salary
router.patch('/:id/pay', payrollController.pay);

module.exports = router;