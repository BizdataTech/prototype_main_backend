import express from "express";
import {
  addToCart,
  clearCart,
  getCart,
} from "../controllers/cartController.js";
import verifyUser from "../middlewares/authentication2.js";
const router = express.Router();

router.get("/cart", verifyUser, getCart);
router.post("/cart", verifyUser, addToCart);
router.delete("/cart", verifyUser, clearCart);

export default router;
