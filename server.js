import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./backend/src/config/db.js";
import { initializeRealtime } from "./backend/src/services/realtimeService.js";

const PORT = Number(process.env.PORT) || 5000;
const httpServer = createServer(app);
const socketServer = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  }
});

initializeRealtime(socketServer);

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed");
    process.exit(1);
  }
};

startServer();