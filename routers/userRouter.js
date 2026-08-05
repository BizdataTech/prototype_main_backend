import express from "express";
import {
  logoutUser,
  signup,
  verifyState,
  signinUser,
  updateProfile,
  changePassword,
  deactivateAccount,
  getAddresses,
  addAddress,
  deleteAddress,
} from "../controllers/userController.js";
import verifyUser from "../middlewares/authentication2.js";

const router = express.Router();

router.get("/auth/verify/me", verifyUser, verifyState);
router.post("/auth/register", signup);
router.post("/auth/sign-in", signinUser);
router.post("/auth/logout", logoutUser);

// Profile and Account management routes
router.put("/auth/profile", verifyUser, updateProfile);
router.put("/auth/change-password", verifyUser, changePassword);
router.delete("/auth/deactivate", verifyUser, deactivateAccount);

// Address management routes
router.get("/auth/addresses", verifyUser, getAddresses);
router.post("/auth/addresses", verifyUser, addAddress);
router.delete("/auth/addresses/:addressId", verifyUser, deleteAddress);

export default router;
