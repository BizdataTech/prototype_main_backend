import express from "express";
import {
  createAttribute,
  getAttributes,
  getAttribute,
  updateAttribute,
  deleteAttribute,
} from "../controllers/attribute.controller.js";

const router = express.Router();

router.post("/attributes", createAttribute);
router.get("/attributes", getAttributes);
router.get("/attributes/:id", getAttribute);
router.put("/attributes/:id", updateAttribute);
router.delete("/attributes/:id", deleteAttribute);

export default router;
