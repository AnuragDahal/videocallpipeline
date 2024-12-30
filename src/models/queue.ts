import mongoose from "mongoose";
import { IQueue } from "../types";

const waitingQueueSchema = new mongoose.Schema({
    socketId: { type: String, required: true, unique: true },
    gender: { type: String, required: true },
    preference: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const WaitingQueue = mongoose.model<IQueue>(
    "WaitingQueue",
    waitingQueueSchema
);
