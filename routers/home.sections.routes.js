import express from "express";
import {
  createSection,
  getReferences,
  getSections,
  getSection,
  deleteSection,
  updateSection,
  updateBanners,
  reorderSections,
} from "../controllers/home.section.controller.js";
import multer from "multer";

const router = express.Router();

router.get("/home-sections/references/:type", getReferences);
router.get("/home-sections", getSections);
router.get("/home-sections/:id", getSection);
router.post(
  "/home-sections",
  multer({ storage: multer.memoryStorage() }).any(),
  createSection,
);
router.put("/home-sections/reorder", reorderSections);
router.put("/home-sections/:id/banners", multer({ storage: multer.memoryStorage() }).any(), updateBanners);
router.put("/home-sections/:id", updateSection);
router.delete("/home-sections/:id", deleteSection);

export default router;
