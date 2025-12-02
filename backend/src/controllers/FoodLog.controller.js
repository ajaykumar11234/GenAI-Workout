import FoodLog from "../models/FoodLog.model.js";
import { asyncHandler } from "../asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiSuccess } from "../utils/ApiSuccess.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Analyze food from image description (Groq doesn't support vision, so we'll use text description)
const analyzeFoodFromDescription = async (description) => {
    const prompt = `You are a nutrition expert. Analyze this food description and provide detailed nutritional information.

Food Description: ${description}

Respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "foodName": "name of the food",
  "portion": "estimated portion size (e.g., 1 cup, 200g, 1 piece)",
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number
  },
  "confidence": "high/medium/low"
}

Be realistic with portion sizes and nutritional values. If unsure, estimate conservatively.`;

    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content;
    
    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```json\n?|\n?```/g, "");
    }
    
    return JSON.parse(cleanedResponse);
};

// Upload food with image
const uploadFoodWithImage = asyncHandler(async (req, res) => {
    try {
        const { mealType, notes, foodDescription } = req.body;
        const userID = req.user?._id;

        if (!userID) {
            throw new ApiError(401, "Unauthorized");
        }

        let imageUrl = null;
        
        // Upload image to Cloudinary if provided
        if (req.file) {
            const uploadResult = await uploadCloudinary(req.file.path);
            if (!uploadResult) {
                throw new ApiError(500, "Failed to upload image");
            }
            imageUrl = uploadResult.secure_url;
        }

        // Analyze food from description
        if (!foodDescription) {
            throw new ApiError(400, "Please provide a food description");
        }

        const analysis = await analyzeFoodFromDescription(foodDescription);

        // Create food log entry
        const foodLog = await FoodLog.create({
            user: userID,
            foodName: analysis.foodName,
            imageUrl: imageUrl,
            portion: analysis.portion,
            nutrition: analysis.nutrition,
            mealType: mealType || 'Snack',
            notes: notes || ''
        });

        return res.status(201).json(
            new ApiSuccess(201, foodLog, "Food logged successfully")
        );
    } catch (error) {
        console.error("Error uploading food:", error);
        throw new ApiError(500, error.message || "Failed to log food");
    }
});

// Log food manually (without image)
const logFoodManually = asyncHandler(async (req, res) => {
    try {
        const { foodName, portion, calories, protein, carbs, fats, fiber, mealType, notes } = req.body;
        const userID = req.user?._id;

        if (!userID) {
            throw new ApiError(401, "Unauthorized");
        }

        if (!foodName || !calories) {
            throw new ApiError(400, "Food name and calories are required");
        }

        const foodLog = await FoodLog.create({
            user: userID,
            foodName,
            portion: portion || '1 serving',
            nutrition: {
                calories: calories || 0,
                protein: protein || 0,
                carbs: carbs || 0,
                fats: fats || 0,
                fiber: fiber || 0
            },
            mealType: mealType || 'Snack',
            notes: notes || ''
        });

        return res.status(201).json(
            new ApiSuccess(201, foodLog, "Food logged successfully")
        );
    } catch (error) {
        console.error("Error logging food:", error);
        throw new ApiError(500, error.message || "Failed to log food");
    }
});

// Get food logs for a date range
const getFoodLogs = asyncHandler(async (req, res) => {
    try {
        const userID = req.user?._id;
        const { startDate, endDate } = req.query;

        if (!userID) {
            throw new ApiError(401, "Unauthorized");
        }

        const query = { user: userID };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (startDate) {
            query.date = { $gte: new Date(startDate) };
        }

        const foodLogs = await FoodLog.find(query).sort({ date: -1 });

        return res.status(200).json(
            new ApiSuccess(200, foodLogs, "Food logs retrieved successfully")
        );
    } catch (error) {
        console.error("Error fetching food logs:", error);
        throw new ApiError(500, "Failed to fetch food logs");
    }
});

// Get today's food logs
const getTodayFoodLogs = asyncHandler(async (req, res) => {
    try {
        const userID = req.user?._id;

        if (!userID) {
            throw new ApiError(401, "Unauthorized");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const foodLogs = await FoodLog.find({
            user: userID,
            date: {
                $gte: today,
                $lt: tomorrow
            }
        }).sort({ date: -1 });

        // Calculate totals
        const totals = foodLogs.reduce((acc, log) => {
            acc.calories += log.nutrition.calories;
            acc.protein += log.nutrition.protein;
            acc.carbs += log.nutrition.carbs;
            acc.fats += log.nutrition.fats;
            acc.fiber += log.nutrition.fiber;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

        return res.status(200).json(
            new ApiSuccess(200, { foodLogs, totals }, "Today's food logs retrieved successfully")
        );
    } catch (error) {
        console.error("Error fetching today's food logs:", error);
        throw new ApiError(500, "Failed to fetch today's food logs");
    }
});

// Delete food log
const deleteFoodLog = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.user?._id;

        if (!userID) {
            throw new ApiError(401, "Unauthorized");
        }

        const foodLog = await FoodLog.findOneAndDelete({
            _id: id,
            user: userID
        });

        if (!foodLog) {
            throw new ApiError(404, "Food log not found");
        }

        return res.status(200).json(
            new ApiSuccess(200, null, "Food log deleted successfully")
        );
    } catch (error) {
        console.error("Error deleting food log:", error);
        throw new ApiError(500, "Failed to delete food log");
    }
});

// Update food log
const updateFoodLog = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.user?._id;
        const updates = req.body;

        if (!userID) {
            throw new ApiError(401, "Unauthorized");
        }

        const foodLog = await FoodLog.findOneAndUpdate(
            { _id: id, user: userID },
            updates,
            { new: true, runValidators: true }
        );

        if (!foodLog) {
            throw new ApiError(404, "Food log not found");
        }

        return res.status(200).json(
            new ApiSuccess(200, foodLog, "Food log updated successfully")
        );
    } catch (error) {
        console.error("Error updating food log:", error);
        throw new ApiError(500, "Failed to update food log");
    }
});

export {
    uploadFoodWithImage,
    logFoodManually,
    getFoodLogs,
    getTodayFoodLogs,
    deleteFoodLog,
    updateFoodLog
};
