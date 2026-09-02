import express from 'express';
import { createOrder, getOrderById, getUserOrders, getAllOrders, updateOrderStatus, deleteOrder, updateOrderItemStatus } from '../controllers/orderController.js';

const router = express.Router();

router.post('/orders', createOrder);
router.get('/orders/:id', getOrderById);
router.get('/orders/user/:userId', getUserOrders);
router.get('/admin/orders', getAllOrders);
router.put('/admin/orders/:id/status', updateOrderStatus);
router.put('/admin/orders/:id/item/:itemId/status', updateOrderItemStatus);
router.delete('/admin/orders/:id', deleteOrder);
export default router;
