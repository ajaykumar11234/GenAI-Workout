import { Router } from "express";
import {
    uploadFoodWithImage,
    logFoodManually,
    getFoodLogs,
    getTodayFoodLogs,
    deleteFoodLog,
    updateFoodLog
} from "../controllers/FoodLog.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const foodLogRouter = Router();

// All routes require authentication
foodLogRouter.use(verifyJWT);

// Upload food with image
foodLogRouter.route("/upload").post(
    upload.single("foodImage"),
    uploadFoodWithImage
);

// Log food manually
foodLogRouter.route("/log").post(logFoodManually);

// Get food logs (with optional date range)
foodLogRouter.route("/").get(getFoodLogs);

// Get today's food logs
foodLogRouter.route("/today").get(getTodayFoodLogs);

// Delete food log
foodLogRouter.route("/:id").delete(deleteFoodLog);

// Update food log
foodLogRouter.route("/:id").patch(updateFoodLog);

export default foodLogRouter;
