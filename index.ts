import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { PeerServer } from "peer";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enhanced Socket.IO configuration
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    transports: ["websocket", "polling"],
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced CORS configuration
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

// Enhanced PeerJS server configuration
const peerServer = PeerServer({
    allow_discovery: true,
    // proxied: process.env.NODE_ENV === "production",
});

app.use("/peerjs", peerServer);

// Enhanced Socket.IO event handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle joining rooms
    socket.on("join-room", (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", userId);
        console.log(`User ${userId} joined room ${roomId}`);
    });

    // Handle messages
    socket.on("message", (message, roomId) => {
        console.log(`Message in room ${roomId}:`, message);
        io.to(roomId).emit("message", {
            content: message,
            senderId: socket.id,
            timestamp: new Date(),
        });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Notify all rooms this socket was in about the disconnection
        socket.rooms.forEach((roomId) => {
            socket.to(roomId).emit("user-disconnected", socket.id);
        });
    });

    // Handle errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
});

// PeerJS connection events
peerServer.on("connection", (client) => {
    console.log("PeerJS client connected:", client.getId());
});

peerServer.on("disconnect", (client) => {
    console.log("PeerJS client disconnected:", client.getId());
});

// Basic health check route
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        port: process.env.PORT,
        environment: process.env.NODE_ENV,
    });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    );
});

// Handle server shutdown gracefully
process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        console.log("HTTP server closed");
    });
});
