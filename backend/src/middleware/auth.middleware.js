import { asyncHandler } from "../asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    let token;

    // ✅ Token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ Token from cookies
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // ✅ No token at all
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decodedToken._id).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error: Token verification failed" });
  }
});


export const verifyAdminJWT = asyncHandler(async (req, res, next) => {
  try {
    let token;

    // ✅ Token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ Token from cookies
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // ✅ No token at all
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const admin = await Admin.findById(decodedToken._id).select("-password -refreshToken");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error: Admin token verification failed" });
  }
});
