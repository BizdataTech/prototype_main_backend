import express from "express";
import {
  addAttributes,
  createAttributeCollection,
  deleteAttribute,
  deleteAttributeCollection,
  getCollectionData,
  getCollections,
  updateAttribute,
} from "../controllers/attributes.collection.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/attribute-collections/:id", getCollectionData);
router.get("/attribute-collections", getCollections);
router.post(
  "/attribute-collections",
  authenticateAdmin,
  createAttributeCollection,
);
router.post("/attribute-collections/:id", authenticateAdmin, addAttributes);
router.patch(
  "/attribute-collections/:coll_id/:att_id",
  authenticateAdmin,
  updateAttribute,
);
router.delete(
  "/attribute-collections/:coll_id",
  authenticateAdmin,
  deleteAttributeCollection,
);
router.delete(
  "/attribute-collections/:coll_id/:att_id",
  authenticateAdmin,
  deleteAttribute,
);

export default router;
