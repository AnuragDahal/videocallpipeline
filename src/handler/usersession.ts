import { User } from "../models/user";
import { IUser } from "../types";
import { ENUM, switchPreference } from "../utils/helper";

export const createUserSession = async (data: IUser) => {
    try {
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
        const matchQuery: any = {
            socketId: { $ne: socketId },
            isAvailable: true,
        };

        if (preference === ENUM.ANY) {
        } else {
            const preferenceToFilter = switchPreference(preference as ENUM);
            matchQuery.gender = preference;
            matchQuery.preference = preferenceToFilter;
        }

        console.log("Match Query:", matchQuery);

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
