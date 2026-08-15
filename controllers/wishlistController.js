/**
 * Wishlist Controller
 * Handles wishlist operations for authenticated client users.
 * All routes require the verifyUser middleware to populate req.user.
 */

import Wishlist from "../models/wishlistModel.js";
import Product from "../models/product.model.js";

/**
 * Manually populates the wishlist items, resolving parent products and variant details
 * to ensure that frontend receives the expected productId shape with parentId.
 */
export const populateWishlist = async (wishlist) => {
  if (!wishlist) return null;
  const wishlistObj = wishlist.toObject ? wishlist.toObject() : wishlist;
  if (!wishlistObj.items) return wishlistObj;

  const populatedItems = [];
  for (const item of wishlistObj.items) {
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

  wishlistObj.items = populatedItems;
  return wishlistObj;
};

/**
 * Retrieves the wishlist for the logged-in user.
 */
export const getWishlist = async (req, res) => {
  const { _id } = req.user;
  try {
    const wishlist = await Wishlist.findOne({ userId: _id });
    const populated = await populateWishlist(wishlist);
    res.status(200).json({ wishlist: populated });
  } catch (error) {
    console.error("Wishlist fetch error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Adds a product to the user's wishlist.
 */
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;
  const { _id } = req.user;

  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  try {
    let product = await Product.findOne({ _id: productId });
    if (!product) {
      product = await Product.findOne({ "variants._id": productId });
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ userId: _id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: _id,
        items: [{ productId }],
      });
    } else {
      const alreadyAdded = wishlist.items.some(
        (item) => item.productId.toString() === productId.toString()
      );
      if (alreadyAdded) {
        const populated = await populateWishlist(wishlist);
        return res
          .status(200)
          .json({ message: "Product already in wishlist", wishlist: populated });
      }
      wishlist.items.push({ productId });
      await wishlist.save();
    }

    const populated = await populateWishlist(wishlist);
    res
      .status(200)
      .json({ message: "Product added to wishlist", wishlist: populated });
  } catch (error) {
    console.error("Add to wishlist error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Removes a single product from the user's wishlist.
 */
export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;
  const { _id } = req.user;

  try {
    const wishlist = await Wishlist.findOne({ userId: _id });
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );
    await wishlist.save();

    const populated = await populateWishlist(wishlist);
    res
      .status(200)
      .json({ message: "Product removed from wishlist", wishlist: populated });
  } catch (error) {
    console.error("Remove from wishlist error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Clears all items from the user's wishlist.
 */
export const clearWishlist = async (req, res) => {
  const { _id } = req.user;
  try {
    await Wishlist.deleteOne({ userId: _id });
    res.status(200).json({ message: "Wishlist cleared successfully" });
  } catch (error) {
    console.error("Clear wishlist error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
