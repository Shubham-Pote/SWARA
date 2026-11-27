import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { mongo } from 'mongoose';
import { z } from 'zod';
import { getJwtSecret } from '../config/auth';
import User, { IUser } from '../models/user';
import UserStats, { getOrCreateUserStats, IUserStats } from '../models/userStats';

const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Email and password are required').toLowerCase(),
  password: z.string().min(1, 'Email and password are required')
});

const registrationSchema = credentialsSchema.extend({
  email: credentialsSchema.shape.email.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
    .refine(password => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be at most 72 bytes'),
  displayName: z.string().trim().min(2, 'Display name must be at least 2 characters long'),
  currentLanguage: z.enum(['spanish', 'japanese']).default('spanish')
});

const profileSchema = z.object({
  displayName: z.string().max(100).trim().min(1).optional(),
  bio: z.string().max(500).trim().optional(),
  location: z.string().max(100).trim().optional(),
  avatarUrl: z.string().trim().optional()
});

const preferencesSchema = z.object({
  dailyGoal: z.number().finite().positive().default(15),
  reminderTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).default('19:00'),
  difficultyPreference: z.enum(['adaptive', 'challenging', 'comfortable']).default('adaptive')
});

type ProfileStats = Pick<IUserStats['spanish'],
  'level' | 'totalXP' | 'streak' | 'lessonsCompleted' | 'timeSpent' | 'averageScore'
>;

function sessionFor(user: IUser, secret: string) {
  return {
    token: jwt.sign({ userId: user._id.toString() }, secret, { expiresIn: '24h' }),
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      level: user.level,
      currentLanguage: user.currentLanguage
    }
  };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    res.status(400).json({
      success: false,
      message: issue.code === 'invalid_type'
        ? 'Email, password, and display name are required'
        : issue.message
    });
    return;
  }

  const secret = getJwtSecret();
  if (!secret) {
    res.status(503).json({ success: false, message: 'Authentication is unavailable' });
    return;
  }

  try {
    if (await User.exists({ email: parsed.data.email })) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const user = await User.create(parsed.data);
    try {
      await getOrCreateUserStats(user._id);
    } catch (error) {
      console.error('Registration stats initialization error:', error);
      res.status(503).json({ success: false, message: 'Account created. Sign in to finish setup.' });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...sessionFor(user, secret)
    });
  } catch (error) {
    if (error instanceof mongo.MongoServerError && error.code === 11000 && error.keyPattern?.email) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  const secret = getJwtSecret();
  if (!secret) {
    res.status(503).json({ success: false, message: 'Authentication is unavailable' });
    return;
  }

  try {
    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    await getOrCreateUserStats(user._id);
    res.json({ success: true, ...sessionFor(user, secret) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error logging in' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const userStats = await UserStats.findOne({ userId });
    const language = user.currentLanguage;
    const stats = language === 'spanish' || language === 'japanese' ? userStats?.[language] : undefined;
    const profileStats: ProfileStats = {
      level: stats?.level || 1,
      totalXP: stats?.totalXP || 0,
      streak: stats?.streak || 0,
      lessonsCompleted: stats?.lessonsCompleted || 0,
      timeSpent: Math.round((stats?.timeSpent || 0) / 60),
      averageScore: stats?.averageScore || 0
    };

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio || '',
        location: user.location || '',
        avatarUrl: user.avatarUrl || '/avatars/default.jpg',
        currentLanguage: user.currentLanguage,
        joinDate: user.joinDate || user.createdAt
      },
      stats: profileStats,
      achievements: calculateAchievements(profileStats)
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid profile fields' });
    return;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user!.userId,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        location: updatedUser.location,
        avatarUrl: updatedUser.avatarUrl,
        currentLanguage: updatedUser.currentLanguage,
        joinDate: updatedUser.joinDate
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

function calculateAchievements(stats: ProfileStats) {
  const achievements = [];

  if (stats.lessonsCompleted >= 1) {
    achievements.push({
      id: 'first_lesson',
      name: 'First Steps',
      description: 'Complete your first lesson',
      icon: 'Star',
      color: 'text-yellow-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  if (stats.streak >= 3) {
    achievements.push({
      id: 'three_days',
      name: 'Getting Started',
      description: '3 day learning streak',
      icon: 'Flame',
      color: 'text-orange-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  if (stats.lessonsCompleted >= 5) {
    achievements.push({
      id: 'five_lessons',
      name: 'Quick Learner',
      description: 'Complete 5 lessons',
      icon: 'BookOpen',
      color: 'text-blue-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  if (stats.averageScore >= 75) {
    achievements.push({
      id: 'good_score',
      name: 'Good Student',
      description: 'Maintain 75%+ average score',
      icon: 'Award',
      color: 'text-green-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  if (stats.timeSpent >= 15) {
    achievements.push({
      id: 'study_time',
      name: 'Study Time',
      description: 'Study for 15+ minutes total',
      icon: 'Clock',
      color: 'text-purple-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  if (stats.streak >= 7) {
    achievements.push({
      id: 'week_streak',
      name: 'Dedicated',
      description: '7 day learning streak',
      icon: 'Flame',
      color: 'text-red-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  if (stats.level >= 2) {
    achievements.push({
      id: 'level_two',
      name: 'Level Up',
      description: 'Reach level 2',
      icon: 'Trophy',
      color: 'text-gold-500',
      earned: true,
      earnedAt: new Date()
    });
  }

  return achievements;
}

export const setActiveLanguage = async (req: Request, res: Response): Promise<void> => {
  const language = req.body?.language;
  if (language !== 'spanish' && language !== 'japanese') {
    res.status(400).json({
      success: false,
      message: 'Invalid language. Must be "spanish" or "japanese"'
    });
    return;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user!.userId,
      { currentLanguage: language },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Language preference updated successfully',
      currentLanguage: language,
      user: {
        id: updatedUser._id,
        displayName: updatedUser.displayName,
        currentLanguage: updatedUser.currentLanguage
      }
    });
  } catch (error) {
    console.error('Language update error:', error);
    res.status(500).json({ success: false, message: 'Error updating language preference' });
  }
};

function publicLanguageStats(stats: IUserStats['spanish']) {
  const { level, totalXP, streak, lessonsCompleted, averageScore, timeSpent, weakAreas, strongAreas } = stats;
  return { level, totalXP, streak, lessonsCompleted, averageScore, timeSpent, weakAreas, strongAreas };
}

export const getUserLanguageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const currentUser = await User.findById(userId).select('currentLanguage');
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const userStats = await getOrCreateUserStats(userId);
    res.json({
      success: true,
      languages: {
        japanese: publicLanguageStats(userStats.japanese),
        spanish: publicLanguageStats(userStats.spanish)
      },
      preferences: userStats.preferences,
      currentLanguage: currentUser.currentLanguage || 'spanish'
    });
  } catch (error) {
    console.error('Language stats fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching language statistics' });
  }
};

export const updateUserPreferences = async (req: Request, res: Response): Promise<void> => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid preferences' });
    return;
  }

  try {
    const userId = req.user!.userId;
    if (!(await User.exists({ _id: userId }))) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { dailyGoal, reminderTime, difficultyPreference } = parsed.data;
    const userStats = await UserStats.findOneAndUpdate(
      { userId },
      {
        $set: {
          'preferences.dailyGoal': dailyGoal,
          'preferences.reminderTime': reminderTime,
          'preferences.difficultyPreference': difficultyPreference
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: userStats.preferences
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ success: false, message: 'Error updating preferences' });
  }
};
