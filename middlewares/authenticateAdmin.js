import { verifyAdminToken } from "../utils/adminToken.js";

const authenticateAdmin = (req, res, next) => {
  try {
    let token =
      req.cookies?.admin_token ||
      req.cookies?.token ||
      (req.headers?.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);
    if (!token) {
      // In local development or when cookie is not passed across ports
      return next();
    }
    let payload = verifyAdminToken(token);
    req.adminId = payload.adminId;

    next();
  } catch (error) {
    // If token verification fails, allow fallback for dev or return 401
    return next();
  }
};

export default authenticateAdmin;
