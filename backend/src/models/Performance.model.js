import mongoose, { Schema } from "mongoose";

const PerformanceSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add an index for efficient querying
    },
    workouts: [
      {
        date: {
          type: Date,
          required: true, // Explicitly require a date to avoid defaulting incorrectly
          default: Date.now,
        },
        todayExercises: [
          {
            workoutName: {
              type: String,
              required: true,
              trim: true, // Trim whitespace
            },
            sets: [
              {
                set: {
                  type: Number,
                  required: true,
                  min: 1, // Minimum set number
                  max: 10, // Example maximum
                },
                rep: {
                  type: Number,
                  required: true,
                  min: 1,
                  max: 100,
                },
                weight: {
                  type: Number,
                  required: true,
                  min: 0, // Prevent negative weight
                },
              },
            ],
            duration: {
              type: Number,
              default: 0, // Duration in seconds
            },
            calories: {
              type: Number,
              default: 0, // Calories burned
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

const PerformanceModel = mongoose.model("Performance", PerformanceSchema);
export default PerformanceModel;