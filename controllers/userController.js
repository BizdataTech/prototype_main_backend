import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import getToken from "../utils/getToken.js";
import verifyPassword from "../utils/verifyPassword.js";

export const verifyState = (req, res) => {
  console.log("user data without token:", req.user);
  return res
    .status(200)
    .json({ success: true, message: "User Authenticated", user: req.user });
};

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let matchingUser = await User.findOne({ email });
    if (matchingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPasword = await bcrypt.hash(password, 10);
    const new_user = await User.create({
      username,
      email,
      password: hashedPasword,
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

// sign in user
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

// logout user
export const logoutUser = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true, message: "User Logged Out" });
};
