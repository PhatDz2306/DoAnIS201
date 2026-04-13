const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkPermission } = require('../middlewares/authMiddleware');
// Route: POST /api/auth/login
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/employees', verifyToken, checkPermission('ALL'), authController.getAllEmployees);
router.put('/employees/:id', authController.updateEmployee);
router.delete('/employees/:id', authController.softDeleteEmployee);

module.exports = router;