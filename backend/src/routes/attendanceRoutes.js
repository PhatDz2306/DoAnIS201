const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const hrController = require('../controllers/hrController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.post('/check-in', verifyToken, attendanceController.checkIn);
router.post('/check-out', verifyToken, attendanceController.checkOut);
router.get('/my-records', verifyToken, attendanceController.getMyRecords);
router.get('/leave-balance', verifyToken, hrController.getLeaveBalance);
router.get('/all-records', verifyToken, checkPermission('ALL'), attendanceController.getAllRecords);
router.put('/edit/:id', verifyToken, checkPermission('ALL'), attendanceController.editRecord);

// Leaves
// Leave endpoints delegated to HR controller (centralized leave management)
router.post('/leaves', verifyToken, hrController.createLeave);
router.get('/my-leaves', verifyToken, hrController.getMyLeaves);
router.get('/leaves/pending', verifyToken, checkPermission('ALL'), hrController.getPendingLeaves);
router.put('/leaves/:id/approve', verifyToken, checkPermission('ALL'), hrController.approveLeave);
router.put('/leaves/:id/reject', verifyToken, checkPermission('ALL'), hrController.rejectLeave);

// Edit history
router.get('/history/:id', verifyToken, checkPermission('ALL'), attendanceController.getEditHistory);

module.exports = router;
