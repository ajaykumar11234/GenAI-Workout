import connectDB from "./db/db.js";
import dotenv from "dotenv";
import { app } from "./app.js";
import { startCronJobs } from "./config/cronJobs.js";

dotenv.config({
  path: './.env'
});

startCronJobs();

connectDB().then(() => {
  app.listen(process.env.PORT || 4000, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${process.env.PORT || 4000}`);
    console.log(`🌐 Health check: http://localhost:${process.env.PORT || 4000}/health`);
  });
}).catch(err => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});
