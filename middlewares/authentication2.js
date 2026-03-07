import jwt from "jsonwebtoken";
import config from "../config.js";

const verifyUser = (req, res, next) => {
  let token = req.cookies?.token;
  try {
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found. Authentication failed!",
      });
    }
    const decoded = jwt.verify(token, config.JWT_SECRET);
    let { username, email, _id } = decoded.user;
    req.user = { username, email, _id };
    console.log("user:", req.user);
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired Token!" });
  }
};

export default verifyUser;
