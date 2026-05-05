const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.post('/calculate', payrollController.calculatePayroll);
router.get('/', payrollController.getPayrollRecords);

// Salary profile (owned by payroll team)
// Allow payroll users to fetch salary profile (PAYROLL or ALL)
router.get('/profile/:id', verifyToken, checkPermission('PAYROLL'), payrollController.getSalaryProfile);
router.put('/profile/:id', verifyToken, checkPermission('PAYROLL'), payrollController.upsertSalaryProfile);

module.exports = router;
