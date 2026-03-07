import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

export const getCart = async (req, res) => {
  let { _id } = req.user;
  try {
    const cart = await Cart.findOne({ userId: _id }).populate({
      path: "items.productId",
      model: "product",
      populate: {
        path: "parentId",
        model: "product",
      },
    });
    console.log("cart:", cart);
    res.json({ cart: cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addToCart = async (req, res) => {
  let { productId } = req.body;
  let { _id } = req.user;
  let quantity = 1;

  // When offer model is added, first check if any offer doc is created with the respective productID
  try {
    let { price } = await Product.findOne({ _id: productId });
    let totalAmount = price * quantity;
    let item = {
      productId,
      quantity,
      totalAmount,
    };
    let cart = await Cart.findOne({ userId: _id });
    if (!cart) {
      let new_cart = await Cart.create({
        userId: _id,
        items: [item],
        cartTotal: totalAmount,
      });
      new_cart = await new_cart.populate({
        path: "items.productId",
        model: "product",
        populate: {
          path: "parentId",
          model: "product",
        },
      });
      return res.status(200).json({
        message: "Product Successfully Added to Cart",
        cart: new_cart,
      });
    }

    cart.items.push(item);
    cart.cartTotal += totalAmount;

    await cart.save();
    cart = await cart.populate({
      path: "items.productId",
      model: "product",
      populate: {
        path: "parentId",
        model: "product",
      },
    });

    res
      .status(200)
      .json({ message: "Product Successfully Added to Cart", cart: cart });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    let { _id } = req.user;
    await Cart.deleteOne({ userId: _id });
    res.status(200).json({ message: "Cart Successfully Cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
