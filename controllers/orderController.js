import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';

export const createOrder = async (req, res) => {
  try {
    const { userId, items, shippingAddress, totalAmount, paymentMethod } = req.body;

    const newOrder = new Order({
      userId,
      items,
      shippingAddress,
      totalAmount,
      paymentMethod,
    });

    const savedOrder = await newOrder.save();

    // Clear cart after order
    await Cart.findOneAndUpdate({ userId }, { items: [], cartTotal: 0 });

    res.status(201).json({ success: true, order: savedOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('items.productId');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).populate('items.productId').sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Admin: Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    
    let query = {};
    
    if (status && status !== 'All') {
      if (status === 'Completed') {
        query.orderStatus = 'Delivered';
      } else {
        query.orderStatus = status;
      }
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    
    if (search) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = search;
      } else {
        // Find users by name first to match userId
        const User = require('../models/userModel.js').default;
        const users = await User.find({ name: { $regex: search, $options: 'i' } });
        if (users.length > 0) {
          query.userId = { $in: users.map(u => u._id) };
        }
      }
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('items.productId')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;
    
    const updateFields = {};
    if (orderStatus) updateFields.orderStatus = orderStatus;
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).populate('items.productId');
    
    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Admin: Delete order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Admin: Update individual item status in an order
export const updateOrderItemStatus = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    item.status = status;
    
    // Optionally update overall order status if all items have the same status
    const allSameStatus = order.items.every(i => i.status === status);
    if (allSameStatus) {
      order.orderStatus = status;
    }

    const updatedOrder = await order.save();
    
    // Populate items again for the response
    await updatedOrder.populate('items.productId');

    res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
