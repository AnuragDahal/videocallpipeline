import { Server, Socket } from "socket.io";
import {
    createUserSession,
    deleteUserSession,
    findUserMatch,
    markUserAvailable,
    markUserBusy,
} from "./usersession";
import { WaitingQueue } from "../models/queue";

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
            findUserMatch(socket.id, data.preference)
                .then(async (remoteSocketID) => {
                    if (remoteSocketID) {
                        console.log("Match found:", {
                            sessionId: socket.id,
                            preference: data.preference,
                            remoteSocketID,
                        });
                        // Notify both users about the match
                        socket.emit("match-found", { remoteSocketID });
                        io.to(remoteSocketID).emit("match-found", {
                            remoteSocketID: socket.id,
                        });

                        // Mark both users as busy
                        await markUserBusy(socket.id);
                        await markUserBusy(remoteSocketID);
                    } else {
                        console.log("No match found for:", {
                            sessionId: socket.id,
                            preference: data.preference,
                        });
                        // Add user to waiting queue
                        const waitingUser = new WaitingQueue({
                            socketId: socket.id,
                            preference: data.preference,
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
        const waitingUsers = await WaitingQueue.find().sort({ createdAt: 1 });
        for (let i = 0; i < waitingUsers.length; i++) {
            const user = waitingUsers[i];
            const preference = user.preference;
            findUserMatch(user.socketId, preference)
                .then(async (remoteSocketID) => {
                    if (remoteSocketID) {
                        console.log("Match found in waiting queue:", {
                            userId: user.socketId,
                            preference,
                            remoteSocketID,
                        });
                        // Notify both users about the match
                        io.to(user.socketId).emit("match-found", {
                            remoteSocketID,
                        });
                        io.to(remoteSocketID).emit("match-found", {
                            remoteSocketID: user.socketId,
                        });

                        // Mark both users as busy
                        await markUserBusy(user.socketId);
                        await markUserBusy(remoteSocketID);

                        // Remove matched users from waiting queue
                        await WaitingQueue.findOneAndDelete({
                            socketId: user.socketId,
                        });
                        await WaitingQueue.findOneAndDelete({
                            socketId: remoteSocketID,
                        });
                    }
                })
                .catch((error) => {
                    console.log("Error finding match in waiting queue:", error);
                });
        }
    }, 15000); // Check every 10 seconds
};
