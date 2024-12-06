import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);

const peerServer = ExpressPeerServer(server, {
    allow_discovery: true,
});

app.use("/peerjs", peerServer);

io.on("connection", (socket) => {
    console.log("User connected");
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
    socket.on("message", (message) => {
        console.log(message);
        io.emit("message", message);
    });
});

app.get("/", (req, res) => {
    res.send(`Hello from the server at ${process.env.PORT}`);
});
server.listen(process.env.PORT, () =>
    console.log(`Server is running on port ${process.env.PORT}`)
);
