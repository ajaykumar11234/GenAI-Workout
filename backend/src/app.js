import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import UserRouter from "./routes/user.routes.js";
import WorkoutRouter from "./routes/workout.routes.js";
import DietRouter from "./routes/diet.routes.js";
import ExerciseRouter from "./routes/exercise.routes.js";
import FoodRouter from "./routes/FoodData.routes.js";
import weightLogRouter from "./routes/weightLog.route.js";
import performanceRouter from "./routes/performance.routes.js";
import AdminRouter from "./routes/Admin.routes.js";
import { dailyRouter } from "./routes/DailyStats.routes.js";
import FitnessChatRouter from "./routes/FitnessChat.routes.js";
import foodLogRouter from "./routes/FoodLog.routes.js";
import formAnalysisRouter from "./routes/FormAnalysis.routes.js";

const app = express();

/* ✅ CORS Configuration */
app.use(
  cors({
    origin: [
      "http://localhost:5173",         // Local frontend
      "http://192.168.1.14:5173",      // Network frontend
      "https://workout2-korh.onrender.com" // Production client
    ],
    credentials: true,
  })
);

/* ✅ Global Middlewares */
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

/* ✅ Health Check */
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/* ✅ Test Root */
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "API Working ✅" });
});

/* ✅ API Routes */
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/user", WorkoutRouter);
app.use("/api/v1/user", DietRouter);
app.use("/api/v1/user", ExerciseRouter);
app.use("/api/v1/user", FoodRouter);
app.use("/api/v1/user", weightLogRouter);
app.use("/api/v1/user", performanceRouter);
app.use("/api/v1/user", dailyRouter);
app.use("/api/v1/user/food-log", foodLogRouter);
app.use("/api/v1/user/form-analysis", formAnalysisRouter);
app.use("/api/v1", FitnessChatRouter);
app.use("/api/v1/admin", AdminRouter);

export { app };

