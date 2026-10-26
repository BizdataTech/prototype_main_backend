import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "user",
      required: true 
    },
    items: [
      {
        productId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "product",
          required: true
        },
        quantity: { 
          type: Number,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        status: {
          type: String,
          enum: ["Order Placed", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
          default: "Order Placed"
        }
      },
    ],
    shippingAddress: {
      firstName: String,
      lastName: String,
      name: String,
      phone: String,
      pincode: String,
      postalCode: String,
      locality: String,
      address: String,
      city: String,
      state: String,
      country: String,
      landmark: String,
      alternatePhone: String,
      addressType: String,
      email: String
    },
    paymentMethod: {
      type: String,
      default: "Cash on Delivery"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },
    orderStatus: {
      type: String,
      enum: ["Order Placed", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Order Placed"
    },
    totalAmount: { 
      type: Number,
      required: true
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("order", orderSchema);

export default Order;
