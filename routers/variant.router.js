import express from "express";
import {
  createVariant,
  getVariants,
  deleteVariant,
  getVariant,
  updateVariant,
} from "../controllers/variants.controller.js";

const router = express.Router();

router.post("/variant", createVariant);
router.post("/variants", createVariant);
router.get("/variants", getVariants);
router.get("/variant", getVariants);
router.delete("/variants/:id", deleteVariant);
router.delete("/variant/:id", deleteVariant);

router.get("/variants/:id", getVariant);
router.put("/variants/:id", updateVariant);

export default router;
