const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');

// Quản lý sản phẩm & khách hàng
router.get('/products', posController.getPosProducts);
router.get('/customer', posController.findCustomer);

// Quản lý đơn hàng tạm (Hold / Cancel)
router.post('/hold', posController.holdOrder);
router.delete('/hold/:id', posController.cancelHoldOrder);

router.get('/hold-orders', posController.getHoldOrders);
router.get('/hold-orders/:id', posController.getHoldOrderDetail);

// Thanh toán chính thức
router.post('/checkout', posController.checkout);

module.exports = router;