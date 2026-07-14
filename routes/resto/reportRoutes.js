const router = require('express').Router();
const reportController = require('../../controllers/resto/reportController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Sales report
router.get('/sales', reportController.salesReport);

// Expense report
router.get('/expenses', reportController.expenseReport);

// Inventory report
router.get('/inventory', reportController.inventoryReport);

// Payroll report
router.get('/payroll', reportController.payrollReport);

// General report (dashboard overview)
router.get('/general', reportController.generalReport);

module.exports = router;