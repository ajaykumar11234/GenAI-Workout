import connectDB from "./db/db.js";
import dotenv from "dotenv";
import { app } from "./app.js";
import { startCronJobs } from "./config/cronJobs.js";

dotenv.config({ path: './.env' });

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 4000;

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);

      // Start cron jobs AFTER server responds
      startCronJobs();
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
