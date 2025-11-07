import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getExerciseData,
  updateExerciseData,
} from "../controllers/Exercise.controller.js";

const ExerciseRouter = Router();

ExerciseRouter.route("/get-exercises").get(getExerciseData);
ExerciseRouter.route("/updateExercise/:id").put(updateExerciseData);

export default ExerciseRouter;