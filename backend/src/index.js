import connectDB from "./db/db.js";
import dotenv from "dotenv";
import { app } from "./app.js";
import { startCronJobs } from "./config/cronJobs.js";

dotenv.config({
  path: './.env'
});

connectDB().then(() => {
  const PORT = process.env.PORT || 4000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);

    // START CRON JOBS ONLY AFTER SERVER SUCCESSFULLY STARTS
    startCronJobs();
  });

}).catch(err => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});
