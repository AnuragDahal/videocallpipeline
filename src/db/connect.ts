import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const connect = async () => {
    try {
        const connection = await mongoose.connect(
            process.env.MONGO_URI as string,
            {
                dbName: process.env.DB_NAME,
            }
        );

        const host = connection.connection.host;
        console.log(`Connected to MongoDB at host: ${host}`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1); // Exit process with failure
    }
};

// Handle connection events
mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to DB");
});

mongoose.connection.on("error", (err) => {
    console.error(`Mongoose connection error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
    console.log("Mongoose disconnected from DB");
});
