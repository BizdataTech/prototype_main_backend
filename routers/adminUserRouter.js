import express from "express";
import {
  createAdminUser,
  loginAdminUser,
  logoutAdminUser,
  verifyAdminUser,
} from "../controllers/adminUserController.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/admin-users/verify", authenticateAdmin, verifyAdminUser);
router.post("/admin-users/sign-up", createAdminUser);
router.post("/admin-users/sign-in", loginAdminUser);
router.post("/admin-users/logout", logoutAdminUser);

export default router;
