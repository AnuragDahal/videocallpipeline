import express from "express";
import { createServer } from "http";
import { connect } from "./src/db/connect";
import { setupSocketIO } from "./src/handler/socket";
import cors from "cors";

const app = express();

app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
        allowedHeaders: ["*"],
    })
);
const server = createServer(app);
const io = setupSocketIO(server);

const PORT = process.env.PORT || 3000;

connect()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Failed to connect to MongoDB:", error);
    });
