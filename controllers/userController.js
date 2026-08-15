import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getToken from "../utils/getToken.js";
import verifyPassword from "../utils/verifyPassword.js";

/**
 * Verifies the authentication state of a user and returns the user's details.
 * @param {Object} req - Express request containing the authenticated user in req.user.
 * @param {Object} res - Express response.
 * @returns {Object} JSON response with the user data.
 */
export const verifyState = (req, res) => {
  console.log("user data without token:", req.user);
  return res
    .status(200)
    .json({ success: true, message: "User Authenticated", user: req.user });
};

/**
 * Handles user sign-up by validating if the email exists, hashing the password, and setting an auth cookie.
 * @param {Object} req - Express request containing username, email, and password in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating success or failure.
 */
export const signup = async (req, res) => {
  const { username, email, password, phone, pincode, locality, address, city, state } = req.body;
  try {
    let matchingUser = await User.findOne({ email });
    if (matchingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPasword = await bcrypt.hash(password, 10);
    
    // Create the default address
    const initialAddress = {
      name: username,
      phone,
      pincode,
      locality,
      address,
      city,
      state,
      addressType: "Home",
      isDefault: true
    };

    const new_user = await User.create({
      username,
      email,
      password: hashedPasword,
      addresses: [initialAddress]
    });
    console.log("new user:", new_user);

    const token = getToken(new_user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res
      .status(200)
      .json({ message: "User Successfully Created", user: new_user });
  } catch (error) {
    console.log("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Handles user sign-in by checking credentials and setting an auth cookie.
 * @param {Object} req - Express request containing email and password in body.
 * @param {Object} res - Express response.
 * @returns {Promise<Object>} JSON response indicating authentication status.
 */
export const signinUser = async (req, res) => {
  console.log("login data:", req.body);
  const { email, password } = req.body;
  try {
    let matchingUser = await User.findOne({ email });
    if (!matchingUser) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    const compareResult = await verifyPassword(password, matchingUser.password);
    if (!compareResult) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    let token = getToken(matchingUser);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(200).json({ message: "User Authenticated", user: matchingUser });
  } catch (error) {
    console.error("error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Handles user log-out by clearing the authentication token cookie.
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Object} JSON response indicating success.
 */
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "User Logged Out" });
};

/**
 * Updates user profile details (username).
 */
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username: name },
      { new: true }
    );
    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Updates user password.
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deactivates user account (deletes user document).
 */
export const deactivateAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(200).json({ success: true, message: "Account deactivated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves all saved addresses for the authenticated user.
 */
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, addresses: user.addresses || [] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Adds a new address to the user's account.
 */
export const addAddress = async (req, res) => {
  try {
    const { _id, name, phone, pincode, locality, address, city, state, landmark, alternatePhone, addressType } = req.body;
    if (!name || !phone || !pincode || !address || !city || !state) {
      return res.status(400).json({ message: "Required address fields are missing" });
    }
    const user = await User.findById(req.user._id);
    
    if (_id) {
      // Update existing address
      const addressIndex = user.addresses.findIndex(a => a._id.toString() === _id.toString());
      if (addressIndex > -1) {
        user.addresses[addressIndex] = { ...user.addresses[addressIndex].toObject(), name, phone, pincode, locality, address, city, state, landmark, alternatePhone, addressType: addressType || 'Home' };
      } else {
        return res.status(404).json({ message: "Address not found" });
      }
    } else {
      // Create new address
      const isDefault = user.addresses.length === 0;
      user.addresses.push({ name, phone, pincode, locality, address, city, state, landmark, alternatePhone, addressType: addressType || 'Home', isDefault });
    }
    
    await user.save();
    return res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes an address from the user's account.
 */
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    await user.save();
    return res.status(200).json({ success: true, addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
