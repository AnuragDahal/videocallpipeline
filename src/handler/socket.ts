import { Server, Socket } from "socket.io";
import {
    createUserSession,
    deleteUserSession,
    findUserMatch,
    markUserAvailable,
    markUserBusy,
} from "./usersession";
import { WaitingQueue } from "../models/queue";
import { isUserBusy } from "../utils/helper";

export const setupSocketIO = (server: any) => {
    const io = new Server(server, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:5173"],
            credentials: true,
        },
    });

    io.on("connection", (socket: Socket) => {
        const { gender, preference } = socket.handshake.query;
        const sessionId = createUserSession({
            gender: gender as string,
            preference: preference as string,
            isAvailable: true,
            socketId: socket.id,
        }).then((sessionId) => {
            console.log("User connected:", {
                sessionId,
                socketId: socket.id,
            });
            socket.emit("session-id", sessionId);
        });
        console.log("User connected:", socket.id);
        socket.on("match-request", (data) => {
            findUserMatch(socket.id, data.preference, data.gender)
                .then(async (remoteSocketId) => {
                    if (remoteSocketId) {
                        console.log("Match found:", {
                            sessionId: socket.id,
                            preference: data.preference,
                            remoteSocketId,
                        });
                        // Designate the current user as the offer initiator
                        io.to(socket.id).emit("match-found", {
                            remoteSocketId,
                            initiator: true, // Current user will send the offer
                        });

                        io.to(remoteSocketId).emit("match-found", {
                            remoteSocketId: socket.id,
                            initiator: false, // Remote user will wait for the offer
                        });
                        // Mark both users as busy
                        await markUserBusy(socket.id);
                        await markUserBusy(remoteSocketId);
                        // Remove matched users from the waiting queue
                        try {
                            await WaitingQueue.deleteOne({
                                socketId: socket.id,
                            });
                            await WaitingQueue.deleteOne({
                                socketId: remoteSocketId,
                            });
                            console.log(
                                "User removed from waiting queue:",
                                socket.id,
                                remoteSocketId
                            );
                        } catch (error) {
                            console.error(
                                "Error removing users from waiting queue:",
                                error
                            );
                        }
                    } else {
                        console.log("No match found for:", {
                            sessionId: socket.id,
                            preference: data.preference,
                            gender: data.gender,
                        });
                        // Add user to waiting queue
                        const waitingUser = new WaitingQueue({
                            socketId: socket.id,
                            preference: data.preference,
                            gender: data.gender,
                        });
                        await waitingUser.save({ validateBeforeSave: false });
                        console.log("User added to waiting queue:", socket.id);
                    }
                })
                .catch((error) => {
                    console.error("Error finding match:", error);
                    // Notify the client about the error
                    socket.emit("error", { message: "Error finding match" });
                });
        });
        socket.on("ice-candidate", ({ to, candidate }) => {
            console.log("Relaying ICE candidate to:", to);
            socket.emit("ice-candidate", candidate);
        });
        socket.on("disconnect", async () => {
            console.log("User disconnected:", socket.id);
            // Remove user from waiting queue if they disconnect
            await WaitingQueue.deleteOne({ socketId: socket.id });
        });

        // Handle WebRTC signaling
        socket.on("offer", ({ to, offer }) => {
            console.log("Relaying offer to:", to);
            socket.to(to).emit("offer", { offer, from: socket.id });
        });

        socket.on("answer", ({ to, answer }) => {
            console.log("Relaying answer to:", to);
            socket.to(to).emit("answer", { answer, from: socket.id });
        });
    });

    // Periodically check for matches in the waiting queue
    setInterval(async () => {
        const waitingUsers = await WaitingQueue.find({
            isAvailable: true,
        }).sort({ createdAt: 1 });

        for (let i = 0; i < waitingUsers.length; i++) {
            const user = waitingUsers[i];
            const preference = user.preference;
            const gender = user.gender;

            if (await isUserBusy(user.socketId)) {
                // Skip processing if the user is already busy
                continue;
            }

            findUserMatch(user.socketId, preference, gender)
                .then(async (remoteSocketId) => {
                    if (remoteSocketId) {
                        // Notify and mark users as matched
                        io.to(user.socketId).emit("match-found", {
                            remoteSocketId,
                            initiator: true, // Current user initiates
                        });
                        io.to(remoteSocketId).emit("match-found", {
                            remoteSocketId: user.socketId,
                            initiator: false,
                        });

                        await markUserBusy(user.socketId);
                        await markUserBusy(remoteSocketId);

                        // Remove matched users from waiting queue
                        await WaitingQueue.deleteOne({
                            socketId: user.socketId,
                        });
                        await WaitingQueue.deleteOne({
                            socketId: remoteSocketId,
                        });
                    }
                })
                .catch((error) => {
                    console.log("Error finding match in waiting queue:", error);
                });
        }
    }, 15000);
};
