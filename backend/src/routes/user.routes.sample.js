/**
 * @swagger
 * /api/v1/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - phone
 *               - gender
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123
 *               phone:
 *                 type: string
 *                 example: "1234567890"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Bad request - validation error
 */

/**
 * @swagger
 * /api/v1/user/login:
 *   post:
 *     summary: Login user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

import express from "express";
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken,
  getCurrentUser,
  updateUserDetails,
  changePassword
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { 
  registerValidator, 
  loginValidator,
  changePasswordValidator 
} from "../validators/user.validator.js";

const router = express.Router();

// Public routes with rate limiting
router.post("/register", authLimiter, registerValidator, registerUser);
router.post("/login", authLimiter, loginValidator, loginUser);

// Protected routes
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/current-user", verifyJWT, getCurrentUser);
router.patch("/update-account", verifyJWT, updateUserDetails);
router.post("/change-password", verifyJWT, changePasswordValidator, changePassword);

export default router;
