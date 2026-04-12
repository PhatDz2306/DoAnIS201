const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/', customerController.getAllCustomers);
router.post('/', customerController.createCustomer);
router.get('/:id/pets', customerController.getPetsByCustomer);
router.post('/:id/pets', customerController.createPet);

module.exports = router;