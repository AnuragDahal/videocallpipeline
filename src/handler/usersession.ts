import { User } from "../models/user";
import { IUser } from "../types";
import { ENUM, switchPreference } from "../utils/helper";

export const createUserSession = async (data: IUser) => {
    try {
        // First, clean up any existing session for this socket
        await User.findOneAndDelete({ socketId: data.socketId });

        const user = new User(data);
        await user.save({ validateBeforeSave: false });
        return user._id;
    } catch (error) {
        console.error("Error creating user session:", error);
        return null;
    }
};

export const findUserMatch = async (socketId: string, preference: string) => {
    try {
        // If the preference is 'ANY', we don't need to switch; just check for availability
        const matchQuery: any = {
            socketId: { $ne: socketId }, // Exclude the current user
            isAvailable: true, // Ensure the user is available
        };
        // Adjust query based on gender preference
        if (preference === ENUM.ANY) {
            // No gender preference, just find any available user
        } else {
            // Switch gender based on the user's preference
            const preferenceToFilter = switchPreference(preference as ENUM);
            matchQuery.gender = preference;
            matchQuery.preference = preferenceToFilter;
        }
        // Log the query to see if it's built correctly
        console.log("Match Query:", matchQuery);
        // Find the user who has been waiting the longest
        const user = await User.findOne(matchQuery);
        console.log("Match Found:", user);
        return user?.socketId || null;
    } catch (error) {
        console.error("Error finding user match:", error);
        return null;
    }
};

export const markUserBusy = async (socketId: string) => {
    try {
        await User.findOneAndUpdate({ socketId }, { isAvailable: false });
    } catch (error) {
        console.error("Error marking user busy:", error);
    }
};

export const markUserAvailable = async (socketId: string) => {
    try {
        await User.findOneAndUpdate(
            { socketId },
            {
                isAvailable: true,
            }
        );
    } catch (error) {
        console.log("Error marking user available:", error);
    }
};

export const deleteUserSession = async (socketId: string) => {
    try {
        await User.findOneAndDelete({ socketId });
        return true;
    } catch (error) {
        console.error("Error deleting user session:", error);
        return false;
    }
};
