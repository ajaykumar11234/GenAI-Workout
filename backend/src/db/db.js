import mongoose from "mongoose";
import { DB_NAME } from "../utils/constants.js";

const connectDB = (async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`✅ MongoDB connected! DB host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    }
});

export default connectDB;