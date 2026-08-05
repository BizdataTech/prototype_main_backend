/**
 * Cart Controller
 * Handles shopping cart operations for customer users, including fetching the cart,
 * adding items to the cart, and clearing the cart.
 */

import Cart from "../models/cartModel.js";
import Product from "../models/product.model.js";

/**
 * Retrieves the shopping cart for the logged-in client user.
 * Populates products and parent variants for correct checkout context.
 * 
 * @param {Object} req - Express request containing logged-in user profile in req.user
 * @param {Object} res - Express response
 */
export const getCart = async (req, res) => {
  let { _id } = req.user;
  try {
    const cart = await Cart.findOne({ userId: _id }).populate({
      path: "items.productId",
      model: "product"
    });
    console.log("cart:", cart);
    res.json({ cart: cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Adds an item to the client user's shopping cart.
 * If the user does not have a cart, creates a new cart; otherwise, appends to the existing cart.
 * 
 * @param {Object} req - Express request containing productId in body and user session in req.user
 * @param {Object} res - Express response
 */
export const addToCart = async (req, res) => {
  let { productId } = req.body;
  let { _id } = req.user;
  let quantity = 1;

  try {
    let product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    let price = product.price;
    let totalAmount = price * quantity;
    
    let cart = await Cart.findOne({ userId: _id });
    
    // Create new cart if none exists for the user
    if (!cart) {
      let item = {
        productId,
        quantity,
        totalAmount,
      };
      let new_cart = await Cart.create({
        userId: _id,
        items: [item],
        cartTotal: totalAmount,
      });
      new_cart = await new_cart.populate({
        path: "items.productId",
        model: "product"
      });
      return res.status(200).json({
        message: "Product Successfully Added to Cart",
        cart: new_cart,
      });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalAmount += totalAmount;
    } else {
      cart.items.push({
        productId,
        quantity,
        totalAmount,
      });
    }

    cart.cartTotal += totalAmount;
    await cart.save();

    cart = await cart.populate({
      path: "items.productId",
      model: "product"
    });

    res
      .status(200)
      .json({ message: "Product Successfully Added to Cart", cart: cart });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Removes an item from the client user's shopping cart.
 */
export const removeFromCart = async (req, res) => {
  let { productId } = req.params;
  let { _id } = req.user;

  try {
    let cart = await Cart.findOne({ userId: _id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex > -1) {
      cart.cartTotal -= cart.items[itemIndex].totalAmount;
      cart.items.splice(itemIndex, 1);
      await cart.save();
    }

    cart = await cart.populate({
      path: "items.productId",
      model: "product"
    });

    res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Updates quantity of an item in the client user's shopping cart.
 */
export const updateQuantity = async (req, res) => {
  let { productId, quantity } = req.body;
  let { _id } = req.user;

  try {
    let cart = await Cart.findOne({ userId: _id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex > -1) {
      let product = await Product.findOne({ _id: productId });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      let oldAmount = cart.items[itemIndex].totalAmount;
      let newAmount = product.price * quantity;

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].totalAmount = newAmount;
      cart.cartTotal = cart.cartTotal - oldAmount + newAmount;

      await cart.save();
    }

    cart = await cart.populate({
      path: "items.productId",
      model: "product"
    });

    res.status(200).json({ message: "Cart updated successfully", cart });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Clears the user's cart by deleting their Cart document.
 * 
 * @param {Object} req - Express request containing logged-in user in req.user
 * @param {Object} res - Express response
 */
export const clearCart = async (req, res) => {
  try {
    let { _id } = req.user;
    await Cart.deleteOne({ userId: _id });
    res.status(200).json({ message: "Cart Successfully Cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
