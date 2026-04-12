const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Khai báo các đường dẫn API tương ứng với Controller
router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);

// Dùng method PATCH vì ta chỉ cập nhật 1 phần nhỏ (trạng thái) của sản phẩm
router.patch('/:id/deactivate', productController.deactivateProduct); 

module.exports = router;