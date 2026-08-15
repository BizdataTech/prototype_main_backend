import bcrypt from "bcryptjs";

export const getHashedPassword = async (password) =>
  await bcrypt.hash(password, 10);

export const verifyPassword = async (password, db_password) =>
  await bcrypt.compare(password, db_password);
