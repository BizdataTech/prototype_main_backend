import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryAttributeCollection,
  getCategoryById,
  updateCategory,
} from "../controllers/categoryController.js";
const router = express.Router();

router.get("/auto-categories", getCategories);
router.get(
  "/categories/:id/attribute-collections",
  getCategoryAttributeCollection,
);
router.get("/auto-categories/:id", getCategoryById);
router.post("/auto-categories", createCategory);
router.put("/auto-categories/:id", updateCategory);
router.delete("/auto-categories/:id", deleteCategory);

export default router;
