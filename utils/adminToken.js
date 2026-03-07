import jwt from "jsonwebtoken";

const ADMIN_SECRET_KEY = process.env.JWT_ADMIN_SECRET;

export const getAdminToken = (id) =>
  jwt.sign({ adminId: id }, ADMIN_SECRET_KEY, { expiresIn: "7d" });

export const verifyAdminToken = (token) => jwt.verify(token, ADMIN_SECRET_KEY);
