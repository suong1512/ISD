const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const upload = require('../config/multer');
const attachmentController = require('../controllers/attachmentController');

router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getDashboardStats);
router.post('/draft', orderController.createDraftOrder);
router.post('/submit', orderController.submitOrder);
router.patch('/:id/submit', orderController.submitDraftOrder);
router.patch('/:id/confirm', orderController.confirmOrder);
router.patch('/:id/reject', orderController.rejectOrder);
router.patch('/:id/prepare', orderController.prepareOrder);
router.patch('/:id/qc', orderController.qcOrder);
router.patch('/:id/ship', orderController.shipOrder);
router.patch('/:id/complete', orderController.completeOrder);
router.post('/:id/invoice', orderController.createInvoice);
router.patch('/:id', orderController.updateDraftOrder);
router.post(
  '/:id/attachments',
  (req, res, next) => {
    console.log('--- UPLOAD ROUTE HIT ---');
    console.log('Order ID:', req.params.id);
    console.log('Content-Type:', req.headers['content-type']);
    next();
  },
    upload.single('file'),
    attachmentController.addOrderAttachment
  );
router.delete('/:id/attachments/:attachmentId', attachmentController.deleteOrderAttachment);
router.get('/:id', orderController.getOrderById);

module.exports = router;