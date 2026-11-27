import express from 'express';
import {
  getCurrentArticle,
  startReading,
  completeArticle,
  generateNextArticle,
  getReadingStats,
  getUserArticles,
  getArticleById
} from '../controllers/readingArticle.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/articles/:language', authMiddleware, getUserArticles);
router.get('/article/:articleId', authMiddleware, getArticleById);
router.get('/current/:language', authMiddleware, getCurrentArticle);
router.post('/start/:articleId', authMiddleware, startReading);
router.post('/complete/:articleId', authMiddleware, completeArticle);
router.post('/next/:language', authMiddleware, generateNextArticle);
router.get('/stats/:language', authMiddleware, getReadingStats);

export default router;
