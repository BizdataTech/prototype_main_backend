import express from "express";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateQuantity,
} from "../controllers/cartController.js";
import verifyUser from "../middlewares/authentication2.js";
const router = express.Router();

router.get("/cart", verifyUser, getCart);
router.post("/cart", verifyUser, addToCart);
router.delete("/cart", verifyUser, clearCart);
router.delete("/cart/:productId", verifyUser, removeFromCart);
router.put("/cart", verifyUser, updateQuantity);

export default router;
