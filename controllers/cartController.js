/**
 * Cart Controller
 * Handles shopping cart operations for customer users, including fetching the cart,
 * adding items to the cart, and clearing the cart.
 */

import Cart from "../models/cartModel.js";
import Product from "../models/product.model.js";

/**
 * Manually populates the cart items, resolving parent products and variant details
 * to ensure that frontend receives the expected productId shape with parentId.
 */
export const populateCart = async (cart) => {
  if (!cart) return null;
  const cartObj = cart.toObject ? cart.toObject() : cart;
  if (!cartObj.items) return cartObj;

  const populatedItems = [];
  for (const item of cartObj.items) {
    if (!item.productId) continue;

    // Check if productId is a parent product
    let parent = await Product.findById(item.productId).populate("brand").populate("category").lean();
    if (parent) {
      populatedItems.push({
        ...item,
        productId: parent
      });
    } else {
      // Check if productId is a variant ID inside a parent product
      const parentWithVariant = await Product.findOne({ "variants._id": item.productId }).populate("brand").populate("category").lean();
      if (parentWithVariant) {
        const variant = parentWithVariant.variants.find(v => v._id.toString() === item.productId.toString());
        if (variant) {
          populatedItems.push({
            ...item,
            productId: {
              _id: variant._id,
              price: variant.price,
              sale_price: variant.sale_price,
              stock: variant.stock,
              images: variant.image?.url ? [variant.image.url] : parentWithVariant.images.map(img => img.url),
              parentId: {
                _id: parentWithVariant._id,
                product_title: parentWithVariant.product_title,
                brand: parentWithVariant.brand ? (parentWithVariant.brand.brand_name || parentWithVariant.brand) : "",
                description: parentWithVariant.description,
                images: parentWithVariant.images.map(img => img.url)
              }
            }
          });
        }
      }
    }
  }

  cartObj.items = populatedItems;
  return cartObj;
};

/**
 * Retrieves the shopping cart for the logged-in client user.
 */
export const getCart = async (req, res) => {
  let { _id } = req.user;
  try {
    const cart = await Cart.findOne({ userId: _id });
    const populated = await populateCart(cart);
    res.json({ cart: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Adds an item to the client user's shopping cart.
 */
export const addToCart = async (req, res) => {
  let { productId } = req.body;
  let { _id } = req.user;
  let quantity = 1;

  try {
    let product = await Product.findOne({ _id: productId });
    if (!product) {
      product = await Product.findOne({ "variants._id": productId });
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let price = Number(product.price || product.sale_price || 0);
    if (product._id.toString() !== productId.toString()) {
      const variant = product.variants.find(v => v._id.toString() === productId.toString());
      if (variant) {
        price = Number(variant.price || variant.sale_price || 0);
      }
    }

    let totalAmount = price * quantity;
    let cart = await Cart.findOne({ userId: _id });
    
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
      const populated = await populateCart(new_cart);
      return res.status(200).json({
        message: "Product Successfully Added to Cart",
        cart: populated,
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

    const populated = await populateCart(cart);
    res.status(200).json({ message: "Product Successfully Added to Cart", cart: populated });
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

    const populated = await populateCart(cart);
    res.status(200).json({ message: "Product removed from cart", cart: populated });
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
        product = await Product.findOne({ "variants._id": productId });
      }
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      let price = Number(product.price || product.sale_price || 0);
      if (product._id.toString() !== productId.toString()) {
        const variant = product.variants.find(v => v._id.toString() === productId.toString());
        if (variant) {
          price = Number(variant.price || variant.sale_price || 0);
        }
      }

      let oldAmount = cart.items[itemIndex].totalAmount;
      let newAmount = price * quantity;

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].totalAmount = newAmount;
      cart.cartTotal = cart.cartTotal - oldAmount + newAmount;

      await cart.save();
    }

    const populated = await populateCart(cart);
    res.status(200).json({ message: "Cart updated successfully", cart: populated });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Clears the user's cart by deleting their Cart document.
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
