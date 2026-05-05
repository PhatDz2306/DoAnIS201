const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');
// Route: POST /api/auth/login
router.post('/login', authController.login);
// Note: Employee management and registration handled by HR module (/api/hr)

module.exports = router;