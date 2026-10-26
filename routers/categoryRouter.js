import express from "express";
import multer from "multer";
import {
  createCategory,
  deleteCategory,
  bulkDeleteCategories,
  getCategories,
  getCategoryAttributeCollection,
  getCategoryVariants,
  getCategoryById,
  updateCategory,
} from "../controllers/categoryController.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get("/auto-categories", getCategories);
router.get(
  "/categories/:id/attribute-collections",
  getCategoryAttributeCollection,
);
router.get("/auto-categories/:id/variants", getCategoryVariants);
router.get("/auto-categories/:id", getCategoryById);
router.post("/auto-categories", upload.single("image"), createCategory);
router.post("/auto-categories/bulk-delete", bulkDeleteCategories);
router.post("/categories/bulk-delete", bulkDeleteCategories);
router.delete("/auto-categories", bulkDeleteCategories);
router.put("/auto-categories/:id", upload.single("image"), updateCategory);
router.delete("/auto-categories/:id", deleteCategory);

export default router;
