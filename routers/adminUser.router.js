import express from "express";
import {
  createAdminUser,
  deleteUser,
  getClients,
  loginAdminUser,
  logoutAdminUser,
  updateStatus,
  verifyAdminUser,
} from "../controllers/adminUser.controller.js";
import authenticateAdmin from "../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/admin-users/verify", authenticateAdmin, verifyAdminUser);
router.post("/admin-users/sign-up", createAdminUser);
router.post("/admin-users/sign-in", loginAdminUser);
router.post("/admin-users/logout", logoutAdminUser);

router.get("/admin-users/clients", authenticateAdmin, getClients);
router.patch(
  "/admin-users/clients/:id/status",
  authenticateAdmin,
  updateStatus,
);
router.delete("/admin-users/clients/:id", authenticateAdmin, deleteUser);

export default router;
