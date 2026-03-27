import express from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/product.controller.js";
import upload from "../middlewares/multer.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";
import multer from "multer";

const router = express.Router();

router.post("/products", upload.array("image"), createProduct);
router.patch(
  "/products/:id",
  multer({ storage: multer.memoryStorage() }).array("image"),
  updateProduct,
);
router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.delete("/products/:id", authenticateAdmin, deleteProduct);

export default router;
