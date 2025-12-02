import { Router } from "express";
import { fitnessChatController } from "../controllers/FitnessChat.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Protected route - requires authentication
router.route("/fitness-chat").post(verifyJWT, fitnessChatController);

export default router;
