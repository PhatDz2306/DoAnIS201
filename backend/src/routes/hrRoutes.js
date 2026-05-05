const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

// Employee management (HR module)
router.post('/register', verifyToken, checkPermission('ALL'), hrController.register);
// Allow payroll users to view employee list too (PAYROLL or ALL)
router.get('/employees', verifyToken, checkPermission('PAYROLL'), hrController.getAllEmployees);
router.put('/employees/:id', verifyToken, checkPermission('ALL'), hrController.updateEmployee);
router.delete('/employees/:id', verifyToken, checkPermission('ALL'), hrController.softDeleteEmployee);

// Weekly attendance view for HR (Manager)
router.get('/employees/weekly-attendance', verifyToken, checkPermission('ALL'), hrController.getEmployeesWeeklyAttendance);

// Leave endpoints
router.post('/leaves', verifyToken, hrController.createLeave);
router.get('/my-leaves', verifyToken, hrController.getMyLeaves);
router.get('/leave-balance', verifyToken, hrController.getLeaveBalance);
router.get('/leaves/pending', verifyToken, checkPermission('ALL'), hrController.getPendingLeaves);
router.put('/leaves/:id/approve', verifyToken, checkPermission('ALL'), hrController.approveLeave);
router.put('/leaves/:id/reject', verifyToken, checkPermission('ALL'), hrController.rejectLeave);

module.exports = router;
