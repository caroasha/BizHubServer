const router = require('express').Router();

// Import all route modules
const menuRoutes = require('./menuRoutes');
const orderRoutes = require('./orderRoutes');
const reservationRoutes = require('./reservationRoutes');
const transactionRoutes = require('./transactionRoutes');
const expenseRoutes = require('./expenseRoutes');
const customerRoutes = require('./customerRoutes');
const employeeRoutes = require('./employeeRoutes');
const payrollRoutes = require('./payrollRoutes');
const stockRoutes = require('./stockRoutes');
const supplierRoutes = require('./supplierRoutes');
const reportRoutes = require('./reportRoutes');
const settingsRoutes = require('./settingsRoutes');
const staffRoutes = require('./staffRoutes');

// Register all routes
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/reservations', reservationRoutes);
router.use('/transactions', transactionRoutes);
router.use('/expenses', expenseRoutes);
router.use('/customers', customerRoutes);
router.use('/employees', employeeRoutes);
router.use('/payroll', payrollRoutes);
router.use('/stock', stockRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/staff', staffRoutes);

module.exports = router;