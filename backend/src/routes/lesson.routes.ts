import express from 'express';
import {
  getLessonsByLanguage,
  getLessonById,
  updateLessonProgress,
  getUserDashboard,
  generateLessonContentController
} from '../controllers/lesson.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/:language', authMiddleware, getLessonsByLanguage);
router.get('/lesson/:lessonId', authMiddleware, getLessonById);

router.get('/:language/dashboard', authMiddleware, getUserDashboard);
router.put('/:lessonId/progress', authMiddleware, updateLessonProgress);

router.post('/generate', authMiddleware, generateLessonContentController);

export default router;
