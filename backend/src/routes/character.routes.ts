// Character API routes
import { Router } from "express";
import { 
  getHistory, 
  clearHistory, 
  startConversation, 
  sendMessage, 
  endConversation
} from "../controllers/character.controller";
import { apiRateLimiter } from "../middleware/rateLimiter.middleware";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication to all character routes
router.use(authMiddleware);

// Conversation management
router.post("/start", apiRateLimiter, startConversation);
router.post("/message", apiRateLimiter, sendMessage);
router.put("/end/:sessionId", apiRateLimiter, endConversation);

// History management
router.get("/history", apiRateLimiter, getHistory);
router.delete("/history", apiRateLimiter, clearHistory);

export default router;
