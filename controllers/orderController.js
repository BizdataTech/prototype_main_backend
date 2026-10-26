import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';
import Product from '../models/product.model.js';
import User from '../models/userModel.js';
import { sendOrderEmail } from '../utils/sendEmail.js';
import { sendOrderSMS } from '../utils/sendSMS.js';
import { sendOrderWhatsApp } from '../utils/sendWhatsApp.js';

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

    // Fetch customer details for notification
    let customerUser = null;
    try {
      if (userId) {
        customerUser = await User.findById(userId).lean();
      }
    } catch (uErr) {
      console.warn('[Notify] Could not find user details:', uErr.message);
    }

    // Build notification items list (resolving full product & variant data)
    let notificationItems = [];
    try {
      const populatedOrder = await populateOrder(savedOrder);
      notificationItems = (populatedOrder.items || []).map((item) => {
        const prod = item.productId || {};
        let name = prod.product_title || 'Product';
        let image = '';
        if (prod.images && prod.images.length > 0) {
          image = typeof prod.images[0] === 'string' ? prod.images[0] : prod.images[0]?.url || '';
        }
        if (prod.parentId) {
          const parentTitle = prod.parentId.product_title || '';
          if (parentTitle && parentTitle !== name) {
            name = `${parentTitle} - ${name}`;
          }
          if (!image && prod.parentId.images?.length > 0) {
            image = typeof prod.parentId.images[0] === 'string' ? prod.parentId.images[0] : prod.parentId.images[0]?.url || '';
          }
        }
        return {
          name,
          quantity: item.quantity,
          price: item.price || prod.sale_price || prod.price || 0,
          image,
        };
      });
    } catch (notifErr) {
      console.error('[Notify] Failed to build item list:', notifErr.message);
      notificationItems = savedOrder.items.map((i) => ({
        name: 'Product',
        quantity: i.quantity,
        price: i.price,
        image: '',
      }));
    }

    // Send email, SMS & WhatsApp notifications (non-blocking)
    sendOrderEmail(savedOrder, notificationItems, customerUser).catch((err) =>
      console.error('[Email] Order notification failed:', err.message)
    );
    sendOrderSMS(savedOrder, notificationItems, customerUser).catch((err) =>
      console.error('[SMS] Order notification failed:', err.message)
    );
    sendOrderWhatsApp(savedOrder, notificationItems, customerUser).catch((err) =>
      console.error('[WhatsApp] Order notification failed:', err.message)
    );

    res.status(201).json({ success: true, order: savedOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Manually populates order items, resolving both parent products and variant items
 * so that frontend receives full product and parentId data.
 */
export const populateOrder = async (order) => {
  if (!order) return null;
  const orderObj = order.toObject ? order.toObject() : order;
  if (!orderObj.items) return orderObj;

  const populatedItems = [];
  for (const item of orderObj.items) {
    if (!item.productId) continue;

    let prodId = item.productId._id || item.productId;
    let parent = await Product.findById(prodId).populate('brand').populate('category').lean();
    if (parent) {
      populatedItems.push({
        ...item,
        productId: parent
      });
    } else {
      const parentWithVariant = await Product.findOne({ 'variants._id': prodId }).populate('brand').populate('category').lean();
      if (parentWithVariant) {
        const variant = parentWithVariant.variants.find(v => v._id.toString() === prodId.toString());
        if (variant) {
          populatedItems.push({
            ...item,
            productId: {
              _id: variant._id,
              product_title: parentWithVariant.product_title,
              price: variant.price,
              sale_price: variant.sale_price,
              stock: variant.stock,
              images: variant.image?.url ? [variant.image.url] : parentWithVariant.images.map(img => img.url),
              parentId: {
                _id: parentWithVariant._id,
                product_title: parentWithVariant.product_title,
                brand: parentWithVariant.brand ? (parentWithVariant.brand.brand_name || parentWithVariant.brand) : '',
                description: parentWithVariant.description,
                images: parentWithVariant.images.map(img => img.url)
              }
            }
          });
          continue;
        }
      }
      populatedItems.push(item);
    }
  }

  orderObj.items = populatedItems;
  return orderObj;
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const populated = await populateOrder(order);
    res.status(200).json({ success: true, order: populated });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const rawOrders = await Order.find({ userId }).sort({ createdAt: -1 });
    const orders = await Promise.all(rawOrders.map(o => populateOrder(o)));
    
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
      if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = search;
      } else {
        // Find users by name first to match userId
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
