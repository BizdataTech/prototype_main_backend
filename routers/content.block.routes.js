import express from "express";
import {
  createContentBlock,
  getBlockData,
  getBlocks,
  updateContentBlock,
} from "../controllers/content.block.controller.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/content-blocks", getBlocks);
router.get("/content-blocks/:id", getBlockData);
router.post("/content-blocks", authenticateAdmin, createContentBlock);
router.patch("/content-blocks/:id", authenticateAdmin, updateContentBlock);

export default router;
