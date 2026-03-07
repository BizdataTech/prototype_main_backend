import express from "express";
import {
  createProduct,
  getProducts,
} from "../controllers/productController.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.post("/auto-products", upload.array("image"), createProduct);
router.get("/auto-products", getProducts);

export default router;
