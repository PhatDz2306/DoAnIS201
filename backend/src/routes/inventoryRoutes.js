const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', inventoryController.getInventory);
router.post('/import', inventoryController.importStock);
router.post('/check', verifyToken, inventoryController.createInventoryCheck);

module.exports = router;
