import express from "express";
import {
  createSection,
  getReferences,
  getSections,
} from "../controllers/home.section.controller.js";
import multer from "multer";

const router = express.Router();

router.get("/home-sections/references/:type", getReferences);
router.get("/home-sections", getSections);
router.post(
  "/home-sections",
  multer({ storage: multer.memoryStorage() }).any(),
  createSection,
);

export default router;
