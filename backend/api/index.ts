// api/index.ts - Vercel Serverless Function Entry Point
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";

import connectDB from "../src/config/database";

// REST route imports
import authRoutes from "../src/routes/auth.routes";
import lessonRoutes from "../src/routes/lesson.routes";
import notesRoutes from "../src/routes/notes.routes";
import readingArticleRoutes from "../src/routes/readingArticle.routes";
import characterRoutes from "../src/routes/character.routes";
import settingsRoutes from "../src/routes/settings.routes";
import vrmRoutes from "../src/routes/vrm.routes";

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to database
connectDB();

// Create Express app
const app = express();

// Global middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ["http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json());

// Static audio files
app.use("/audio", express.static(path.join(__dirname, "../public/audio"), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'audio/wav');
  }
}));

// Welcome route
app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to the Language Learning API",
    status: "online",
    timestamp: new Date().toISOString(),
    features: [
      "Traditional Lessons",
      "Notes & Reading",
      "AI Characters (real-time chat & VRM animation)"
    ]
  })
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// CORS test endpoint
app.get("/api/test", (_req, res) => {
  res.json({ 
    success: true, 
    message: "CORS is working!",
    timestamp: new Date().toISOString()
  });
});

// REST routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/reading", readingArticleRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/vrm", vrmRoutes);

// Error handler
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, message: "Something broke!" });
  }
);

// Export for Vercel serverless
export default app;
