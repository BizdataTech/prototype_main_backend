import express from "express";
import {
  createProduct,
  deleteProduct,
  bulkDeleteProducts,
  getProduct,
  getProducts,
  updateProduct,
  importProducts,
  exportProducts,
} from "../controllers/product.controller.js";
import upload from "../middlewares/multer.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";
import multer from "multer";

const router = express.Router();

router.get("/products/export", exportProducts);
router.post("/products/import", upload.any(), importProducts);
router.post("/products", upload.any(), createProduct);
router.patch(
  "/products/:id",
  multer({ storage: multer.memoryStorage() }).any(),
  updateProduct,
);
router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.post("/products/bulk-delete", authenticateAdmin, bulkDeleteProducts);
router.delete("/products/:id", authenticateAdmin, deleteProduct);

export default router;
