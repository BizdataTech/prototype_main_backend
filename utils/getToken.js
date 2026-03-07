import jwt from "jsonwebtoken";
const getToken = (user) => {
  const secretkey = process.env.JWT_SECRET;
  return jwt.sign({ user }, secretkey, { expiresIn: "7d" });
};

export default getToken;
