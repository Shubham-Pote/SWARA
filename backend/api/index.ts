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

// Create Express app
const app = express();

// Database connection state
let isConnected = false;

// Lazy database connection for serverless
const ensureDBConnection = async () => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      // Don't throw - allow app to respond with error
    }
  }
};

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

// Database connection middleware (only for routes that need it)
const dbMiddleware = async (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
  await ensureDBConnection();
  next();
};

// Static audio files
app.use("/audio", express.static(path.join(__dirname, "../public/audio"), {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'audio/wav');
  }
}));

// Welcome route (no DB needed)
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

// Health check endpoint (no DB needed)
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    dbConnected: isConnected
  });
});

// CORS test endpoint (no DB needed)
app.get("/api/test", (_req, res) => {
  res.json({ 
    success: true, 
    message: "CORS is working!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// REST routes (with DB middleware)
app.use("/api/auth", dbMiddleware, authRoutes);
app.use("/api/lessons", dbMiddleware, lessonRoutes);
app.use("/api/notes", dbMiddleware, notesRoutes);
app.use("/api/reading", dbMiddleware, readingArticleRoutes);
app.use("/api/character", dbMiddleware, characterRoutes);
app.use("/api/settings", dbMiddleware, settingsRoutes);
app.use("/api/vrm", dbMiddleware, vrmRoutes);
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
