import express from "express";
import {
  createAttributeCollection,
  getAttributeCollections,
} from "../controllers/attributes.collection.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/attribute-collections", getAttributeCollections);
router.post(
  "/attribute-collection",
  authenticateAdmin,
  createAttributeCollection,
);

export default router;
