/**
 * Admin User Controller
 * Manages administrative user operations including sign-up, sign-in, session verification, 
 * logout, and client-user account moderation (blocking/deleting).
 */

import AdminUser from "../models/adminUserModel.js";
import User from "../models/userModel.js";
import { getAdminToken } from "../utils/adminToken.js";
import { getHashedPassword, verifyPassword } from "../utils/bcrypt.js";

/**
 * Verifies the validity of an admin user's current session.
 * 
 * @param {Object} req - Express request containing adminId set by auth middleware
 * @param {Object} res - Express response
 */
export const verifyAdminUser = async (req, res) => {
  try {
    let user = await AdminUser.findOne({ _id: req.adminId }).select(
      "email username",
    );
    return res.json({ user });
  } catch (error) {
    console.log("failed to validate admin user :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Registers/Creates a new administrator account.
 * 
 * @param {Object} req - Express request containing username, email, and password
 * @param {Object} res - Express response
 */
export const createAdminUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username.trim() || !email.trim() || !password.trim())
      return res.status(400).json({ message: "Invalid Input Data" });
      
    // Hash password before saving to db
    let hashed_password = await getHashedPassword(password);
    await AdminUser.create({ username, email, password: hashed_password });
    return res.json({ message: "User Created" });
  } catch (error) {
    console.log("failed to create admin user :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Logs in an admin user by checking credentials and setting a secure admin token cookie.
 * 
 * @param {Object} req - Express request containing email and password
 * @param {Object} res - Express response
 */
export const loginAdminUser = async (req, res) => {
  try {
    let { email, password } = req.body;
    const auth_message = "Login Failed : Incorrect Email or Password";
    if (!email.trim() || !password.trim())
      return res
        .status(400)
        .json({ message: "Login Failed : Credentials Not Found" });
        
    // Find admin by email
    const admin = await AdminUser.findOne({ email });
    if (!admin) return res.status(401).json({ message: auth_message });
    
    // Check password validity
    let authenticated = await verifyPassword(password, admin.password);
    if (!authenticated) return res.status(401).json({ message: auth_message });

    // Generate JWT token and set in HTTP-only cookie
    const token = getAdminToken(admin._id);
    return res
      .cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      })
      .status(201)
      .json({ message: "User Created" }); // message is "User Created" on login success in original code
  } catch (error) {
    console.log("failed to log-in admin user :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Logs out the admin user by clearing the admin token cookie.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const logoutAdminUser = async (req, res) => {
  try {
    console.log(req.body);
    return res
      .clearCookie("admin_token", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      })
      .status(200)
      .json({ message: "User Logged Out" });
  } catch (error) {
    console.log("failed to log-out admin user :", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Fetches all registered customer/client users.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getClients = async (req, res) => {
  try {
    let users = await User.find()
      .select("-password -updatedAt -__v")
      .sort({ createdAt: -1 });
    return res.json({ result: users });
  } catch (error) {
    console.log("failed to get client users:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Toggles a client user's status (blocked/unblocked).
 * 
 * @param {Object} req - Express request containing client ID in params
 * @param {Object} res - Express response
 */
export const updateStatus = async (req, res) => {
  try {
    let user = await User.updateOne(
      { _id: req.params.id },
      [{ $set: { blocked: { $not: "$blocked" } } }],
      { new: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "Status Updated" });
  } catch (error) {
    console.log("failed to update the user status:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes a client user account by ID.
 * 
 * @param {Object} req - Express request containing client ID in params
 * @param {Object} res - Express response
 */
export const deleteUser = async (req, res) => {
  try {
    let user = await User.findByIdAndDelete(
      { _id: req.params.id },
      { new: true },
    );
    if (!user) return res.status(404).json({ message: "User Not Fount" });
    return res.json({ message: "User Deleted" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};
