import express from "express";
import {
  createBrand,
  deleteBrand,
  getBrand,
  getBrands,
  updateBrand,
} from "../controllers/brandController.js";
import upload from "../middlewares/multer.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";
import multer from "multer";

const router = express.Router();

router.post("/brands", upload.single("image"), authenticateAdmin, createBrand);
router.get("/brands", getBrands);
router.get("/brands/:id", getBrand);
router.patch(
  "/brands/:id",
  authenticateAdmin,
  multer({ storage: multer.memoryStorage() }).single("image"),
  updateBrand,
);
router.delete("/brands/:id", authenticateAdmin, deleteBrand);

export default router;
