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

const app = express();

/* ✅ CORS Fix */
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

/* ✅ Routes */
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/user", WorkoutRouter);
app.use("/api/v1/user", DietRouter);
app.use("/api/v1/user", ExerciseRouter);
app.use("/api/v1/user", FoodRouter);
app.use("/api/v1/user", weightLogRouter);
app.use("/api/v1/user", performanceRouter);
app.use("/api/v1/user", dailyRouter);
app.use("/api/v1/admin", AdminRouter);

/* ✅ Test Root */
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "API Working ✅" });
});

export { app };
