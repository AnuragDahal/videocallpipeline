export interface IUser {
    gender: string;
    preference: string;
    isAvailable: boolean;
    socketId: string;
}
export interface IQueue {
    socketId: string;
    preference: string;
    gender: string;
    createdAt: Date;
}
