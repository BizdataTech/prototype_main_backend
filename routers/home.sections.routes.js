import express from "express";
import { getSections } from "../controllers/home.section.controller.js";

const router = express.Router();

router.get("/home-sections", getSections);

export default router;
