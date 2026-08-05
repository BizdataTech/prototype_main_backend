/**
 * Wishlist Controller
 * Handles wishlist operations for authenticated client users.
 * All routes require the verifyUser middleware to populate req.user.
 */

import Wishlist from "../models/wishlistModel.js";

/**
 * Retrieves the wishlist for the logged-in user.
 * Populates productId with its parent product for full display data.
 *
 * @param {Object} req - Express request containing req.user from auth middleware
 * @param {Object} res - Express response
 */
export const getWishlist = async (req, res) => {
  const { _id } = req.user;
  try {
    const wishlist = await Wishlist.findOne({ userId: _id }).populate({
      path: "items.productId",
      model: "product"
    });
    res.status(200).json({ wishlist: wishlist || null });
  } catch (error) {
    console.error("Wishlist fetch error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Adds a product to the user's wishlist.
 * Creates a new wishlist document if the user does not have one yet.
 * Skips duplicate entries silently.
 *
 * @param {Object} req - Express request with { productId } in body
 * @param {Object} res - Express response
 */
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;
  const { _id } = req.user;

  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  try {
    let wishlist = await Wishlist.findOne({ userId: _id });

    if (!wishlist) {
      // Create a new wishlist for the user
      wishlist = await Wishlist.create({
        userId: _id,
        items: [{ productId }],
      });
    } else {
      // Check for existing entry to avoid duplicates
      const alreadyAdded = wishlist.items.some(
        (item) => item.productId.toString() === productId.toString()
      );
      if (alreadyAdded) {
        return res
          .status(200)
          .json({ message: "Product already in wishlist", wishlist });
      }
      wishlist.items.push({ productId });
      await wishlist.save();
    }

    // Populate and return the updated wishlist
    wishlist = await Wishlist.findOne({ userId: _id }).populate({
      path: "items.productId",
      model: "product"
    });

    res
      .status(200)
      .json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    console.error("Add to wishlist error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Removes a single product from the user's wishlist.
 *
 * @param {Object} req - Express request with productId in req.params
 * @param {Object} res - Express response
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

    const updated = await Wishlist.findOne({ userId: _id }).populate({
      path: "items.productId",
      model: "product"
    });

    res
      .status(200)
      .json({ message: "Product removed from wishlist", wishlist: updated });
  } catch (error) {
    console.error("Remove from wishlist error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Clears all items from the user's wishlist.
 *
 * @param {Object} req - Express request containing req.user
 * @param {Object} res - Express response
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
