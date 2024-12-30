import { User } from "../models/user";

export enum ENUM {
    MALE = "male",
    FEMALE = "female",
    ANY = "any",
}
export const isUserBusy = async (socketId: string) => {
    const userSession = await User.findOne({ socketId });
    return userSession && !userSession.isAvailable;
};
