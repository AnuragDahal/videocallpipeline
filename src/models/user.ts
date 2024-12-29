import mongoose from "mongoose";
import { IUser } from "../types";

const userSchema = new mongoose.Schema({
    gender: String,
    preference: String,
    isAvailable: { type: Boolean, default: true },
    socketId: String,
});

export const User = mongoose.model<IUser>("User", userSchema);
