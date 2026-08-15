import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlistController.js";
import verifyUser from "../middlewares/authentication2.js";

const router = express.Router();

// GET    /api/wishlist             — fetch user's wishlist
router.get("/wishlist", verifyUser, getWishlist);

// POST   /api/wishlist             — add item { productId } to wishlist
router.post("/wishlist", verifyUser, addToWishlist);

// DELETE /api/wishlist/:productId  — remove a single item from wishlist
router.delete("/wishlist/:productId", verifyUser, removeFromWishlist);

// DELETE /api/wishlist             — clear entire wishlist
router.delete("/wishlist", verifyUser, clearWishlist);

export default router;
