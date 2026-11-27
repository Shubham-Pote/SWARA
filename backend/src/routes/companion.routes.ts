import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware';
import { loadLearner, getHistory, sendMessage, startConversation } from '../controllers/companion.controller';

const messagesPerHour = Number(process.env.MAX_CONVERSATIONS_PER_HOUR);
const limiter = rateLimit({
  windowMs: 3600000, limit: messagesPerHour > 0 ? messagesPerHour : 100,
  keyGenerator: req => req.user!.userId, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Hourly conversation limit reached. Try again later.' }
});

const router = Router();
router.use(authMiddleware);
router.use('/:language', loadLearner);
router.get('/:language/history', getHistory);
router.post('/:language/new-conversation', startConversation);
router.post('/:language/message', limiter, sendMessage);

export default router;
