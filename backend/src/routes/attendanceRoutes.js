const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');

router.post('/check-in', verifyToken, attendanceController.checkIn);
router.post('/check-out', verifyToken, attendanceController.checkOut);
router.get('/my-records', verifyToken, attendanceController.getMyRecords);
router.get('/leave-balance', verifyToken, attendanceController.getLeaveBalance);
router.get('/all-records', verifyToken, checkPermission('ALL'), attendanceController.getAllRecords);
router.put('/edit/:id', verifyToken, checkPermission('ALL'), attendanceController.editRecord);

// Leaves
router.post('/leaves', verifyToken, attendanceController.createLeave);
router.get('/my-leaves', verifyToken, attendanceController.getMyLeaves);
router.get('/leaves/pending', verifyToken, checkPermission('ALL'), attendanceController.getPendingLeaves);
router.put('/leaves/:id/approve', verifyToken, checkPermission('ALL'), attendanceController.approveLeave);
router.put('/leaves/:id/reject', verifyToken, checkPermission('ALL'), attendanceController.rejectLeave);

// Edit history
router.get('/history/:id', verifyToken, checkPermission('ALL'), attendanceController.getEditHistory);

module.exports = router;
