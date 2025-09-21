// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import http from "http";

import connectDB from "./config/database";
import { initWebsocketLayer } from "./websocket/socketServer";

// ────────────────────────────────────────────────────────────
// REST route imports
// ────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.routes";
import lessonRoutes from "./routes/lesson.routes";
import notesRoutes from "./routes/notes.routes";
import readingArticleRoutes from "./routes/readingArticle.routes";

import characterRoutes from "./routes/character.routes";
import settingsRoutes from "./routes/settings.routes";
import vrmRoutes from "./routes/vrm.routes";

// ────────────────────────────────────────────────────────────
// Environment & DB
// ────────────────────────────────────────────────────────────
dotenv.config({ path: path.join(__dirname, '.env') });
connectDB();

// ────────────────────────────────────────────────────────────
// Express + HTTP server bootstrap
// ────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);        // share port with Socket.IO
const io = initWebsocketLayer(server);        // websocket namespaces
app.set("io", io);                            // expose to controllers

// ────────────────────────────────────────────────────────────
// Global middleware
// ────────────────────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:8080"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json());

// Static audio (lesson mp3/ogg)
app.use("/audio", express.static(path.join(__dirname, "../public/audio")));

// ────────────────────────────────────────────────────────────
// Welcome
// ────────────────────────────────────────────────────────────
app.get("/", (_req, res) =>
  res.json({
    message: "Welcome to the Language Learning API",
    features: [
      "Traditional Lessons",
      "Notes & Reading",
      "AI Characters (real-time chat & VRM animation)"
    ]
  })
);

// ────────────────────────────────────────────────────────────
// REST routes
// ────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/lessons",   lessonRoutes);
app.use("/api/notes",     notesRoutes);
app.use("/api/reading",   readingArticleRoutes);

// Character routes enabled for authentication endpoints
app.use("/api/character", characterRoutes);
app.use("/api/settings",  settingsRoutes);
app.use("/api/vrm",       vrmRoutes);
app.use("/api/vrm",       vrmRoutes);

// ────────────────────────────────────────────────────────────
// Error handler
// ────────────────────────────────────────────────────────────
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, message: "Something broke!" });
  }
);

// ────────────────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 REST & WebSocket server running at http://localhost:${PORT}`)
);

