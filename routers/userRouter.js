import express from "express";
import {
  logoutUser,
  signup,
  verifyState,
  signinUser,
} from "../controllers/userController.js";
import verifyUser from "../middlewares/authentication2.js";

const router = express.Router();

router.get("/auth/verify/me", verifyUser, verifyState);
router.post("/auth/register", signup);
router.post("/auth/sign-in", signinUser);
router.post("/auth/logout", logoutUser);

export default router;
