import express from "express";
import {
  getReferences,
  getSections,
} from "../controllers/home.section.controller.js";

const router = express.Router();

router.get("/home-sections/references/:type", getReferences);
router.get("/home-sections", getSections);

export default router;
