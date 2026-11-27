import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  setActiveLanguage,
  getUserLanguageStats,
  updateUserPreferences
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/language', authMiddleware, setActiveLanguage);
router.get('/language-stats', authMiddleware, getUserLanguageStats);
router.put('/preferences', authMiddleware, updateUserPreferences);

export default router;
