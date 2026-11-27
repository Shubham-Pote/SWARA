import { Request, Response } from 'express';
import { Error as MongooseError, isObjectIdOrHexString, mongo } from 'mongoose';
import { z } from 'zod';
import Lesson, { ILesson } from '../models/lesson';
import Progress, { IProgress } from '../models/progress';
import UserStats, { getOrCreateUserStats } from '../models/userStats';
import { generateLessonContent } from '../services/gemini.service';
import { countConsecutiveCompletionDays } from '../utils/completionStreak';

const lessonLanguage = z.enum(['spanish', 'japanese']);
const invalidLanguage = 'Invalid language. Must be "spanish" or "japanese"';
const completedStatuses = ['completed', 'mastered'];
const writeAttempts = 5;

const progressInput = z.object({
  language: lessonLanguage,
  currentStep: z.number().int().nonnegative().default(0),
  totalSteps: z.number().int().nonnegative().optional(),
  score: z.number().min(0).max(100).default(0),
  timeSpent: z.number().finite().nonnegative().default(0),
  mistakes: z.array(z.string()).optional(),
  completed: z.boolean().default(false)
});

const generationInput = z.object({
  language: lessonLanguage,
  topic: z.string().trim().min(1),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  lessonType: z.string().trim().min(1).default('practice'),
  generateAudio: z.boolean().default(false)
});

function progressDetails(progress?: IProgress) {
  return {
    status: progress?.status ?? 'not_started',
    currentStep: progress?.currentStep ?? 0,
    progress: progress?.progress ?? 0,
    completed: progress?.completed ?? false,
    score: progress?.score ?? 0,
    timeSpent: progress?.timeSpent ?? 0
  };
}

export const getLessonsByLanguage = async (req: Request, res: Response): Promise<void> => {
  const language = lessonLanguage.safeParse(req.params.language);
  if (!language.success) {
    res.status(400).json({ success: false, message: invalidLanguage });
    return;
  }

  try {
    const [lessons, progress] = await Promise.all([
      Lesson.find({ language: language.data, isActive: true })
        .select('title description language difficulty level estimatedMinutes xpReward prerequisites order steps culturalNotes isActive createdAt updatedAt')
        .sort({ order: 1, level: 1 }),
      Progress.find({ userId: req.user!.userId, language: language.data })
    ]);
    const progressByLesson = new Map(progress.map(item => [item.lessonId?.toString(), item]));

    res.json({
      success: true,
      lessons: lessons.map(lesson => ({
        ...lesson.toObject(),
        ...progressDetails(progressByLesson.get(lesson._id.toString()))
      })),
      language: language.data
    });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lessons' });
  }
};

export const getLessonById = async (req: Request, res: Response): Promise<void> => {
  const { lessonId } = req.params;
  if (!isObjectIdOrHexString(lessonId)) {
    res.status(400).json({ success: false, message: 'Invalid lesson ID' });
    return;
  }

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    const progress = await Progress.findOne({ userId: req.user!.userId, lessonId });
    const lastStep = Math.max(0, (lesson.steps?.length ?? 0) - 1);
    res.json({
      success: true,
      lesson: {
        ...lesson.toObject(),
        // LessonView reports the step it just finished, before advancing.
        currentProgress: progress && !progress.completed ? Math.min(progress.currentStep + 1, lastStep) : 0,
        completed: progress?.completed ?? false,
        progress: progress ? progressDetails(progress) : null
      }
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lesson' });
  }
};

async function saveProgress(userId: string, lesson: ILesson, input: z.infer<typeof progressInput>) {
  const key = { userId, lessonId: lesson._id };

  for (let attempt = 0; attempt < writeAttempts; attempt += 1) {
    const existing = await Progress.findOne(key);
    const progress = existing ?? new Progress({ ...key, language: lesson.language });
    const totalSteps = lesson.steps?.length || existing?.totalSteps || input.totalSteps || 5;
    const lastStep = totalSteps - 1;
    const finishing = input.currentStep >= lastStep && (input.completed || input.score > 0);
    const submittedStep = Math.min(input.currentStep, lastStep);
    if (existing && existing.lastSubmittedStep === submittedStep && (!finishing || existing.completed)) {
      // A multi-step review sends an earlier step before it can finish again.
      if (finishing && existing.completed && totalSteps > 1 && input.score <= existing.score) return existing;
      // Recover a previously saved step when its stats receipt is still behind.
      const receiptPath = `${lesson.language}.lessonReceipts.${lesson.id}`;
      const stats = await UserStats.findOne({ userId }).select(receiptPath);
      const receipt = stats?.[lesson.language].lessonReceipts?.get(lesson.id);
      if ((existing.statsSync.xpReward && !receipt?.xpAwarded) ||
          (receipt?.timeSpent ?? 0) < existing.statsSync.timeSpent) return existing;
    }

    progress.language = lesson.language;
    progress.lastSubmittedStep = submittedStep;
    progress.currentStep = Math.min(Math.max(progress.currentStep, input.currentStep), lastStep);
    progress.totalSteps = totalSteps;
    progress.score = Math.max(progress.score, input.score);
    progress.timeSpent += input.timeSpent;
    progress.statsSync.timeSpent += input.timeSpent;
    progress.lastAccessed = new Date();
    if (existing) progress.attempts += 1;
    if (input.mistakes?.length) progress.mistakes = [...new Set([...(progress.mistakes ?? []), ...input.mistakes])];

    if (finishing || progress.completed) {
      progress.status = progress.score >= 90 ? 'mastered' : 'completed';
      progress.completedAt ??= progress.lastAccessed;
      if (!progress.xpAwarded) {
        progress.xpAwarded = true;
        progress.statsSync.xpReward = lesson.xpReward || 50;
        progress.statsSync.score = progress.score;
      }
    } else {
      progress.status = 'in_progress';
    }

    // Old imports may lack the version key used by Mongoose's optimistic concurrency.
    if (existing && progress.get('__v') === undefined) progress.$where = { __v: { $exists: false } };

    try {
      return await progress.save();
    } catch (error) {
      const duplicateInsert = !existing && error instanceof mongo.MongoServerError && error.code === 11000;
      if (!(error instanceof MongooseError.VersionError) && !duplicateInsert) throw error;
    }
  }

  throw new Error('Lesson progress changed during each write attempt');
}

async function calculateStreak(progress: IProgress) {
  const completed = await Progress.find({
    userId: progress.userId,
    language: progress.language,
    status: { $in: completedStatuses },
    completedAt: { $exists: true }
  }).select('completedAt').sort({ completedAt: -1 }).lean();

  return countConsecutiveCompletionDays(completed);
}

async function syncLessonStats(progress: IProgress) {
  const { userId, language, lessonId, statsSync } = progress;
  const receiptField = `${language}.lessonReceipts.${lessonId}`;
  const versionField = `${language}.lessonStatsVersion`;

  for (let attempt = 0; attempt < writeAttempts; attempt += 1) {
    const userStats = await getOrCreateUserStats(userId);
    const stats = userStats[language];
    const receipt = stats.lessonReceipts?.get(lessonId.toString());
    const recordedTime = receipt?.timeSpent ?? 0;
    const timeToAdd = Math.max(0, statsSync.timeSpent - recordedTime);
    const xp = receipt?.xpAwarded ? 0 : (statsSync.xpReward ?? 0);
    if (!xp && !timeToAdd) return 0;

    // Write the totals and their receipt together so replaying a saved snapshot is safe.
    const fields: Record<string, number | { timeSpent: number; xpAwarded: boolean }> = {
      [versionField]: (stats.lessonStatsVersion ?? 0) + 1,
      [receiptField]: { timeSpent: Math.max(recordedTime, statsSync.timeSpent), xpAwarded: Boolean(receipt?.xpAwarded || xp) },
      [`${language}.timeSpent`]: (stats.timeSpent || 0) + timeToAdd
    };

    if (xp) {
      const totalXP = (stats.totalXP || 0) + xp;
      const lessonsCompleted = (stats.lessonsCompleted || 0) + 1;
      fields[`${language}.totalXP`] = totalXP;
      fields[`${language}.level`] = Math.max(1, Math.floor(totalXP / 100) + 1);
      fields[`${language}.lessonsCompleted`] = lessonsCompleted;
      fields[`${language}.averageScore`] = Math.round(
        (((stats.averageScore || 0) * (lessonsCompleted - 1)) + (statsSync.score ?? 0)) / lessonsCompleted
      );
      fields[`${language}.streak`] = await calculateStreak(progress);
    }

    const result = await UserStats.updateOne(
      { userId, [versionField]: stats.lessonStatsVersion ?? { $exists: false } },
      { $set: fields }
    );
    if (result.matchedCount) return xp;
  }

  throw new Error('Lesson stats changed during each write attempt');
}

export const updateLessonProgress = async (req: Request, res: Response): Promise<void> => {
  const { lessonId } = req.params;
  if (!isObjectIdOrHexString(lessonId)) {
    res.status(400).json({ success: false, message: 'Invalid lesson ID' });
    return;
  }

  const parsed = progressInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid lesson progress' });
    return;
  }

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ success: false, message: 'Lesson not found' });
      return;
    }

    const progress = await saveProgress(req.user!.userId, lesson, parsed.data);
    let xpAwarded: number;
    try {
      xpAwarded = await syncLessonStats(progress);
    } catch (error) {
      console.error('Lesson stats sync error:', error);
      res.status(503).json({ success: false, message: 'Progress saved. Update progress again to refresh lesson stats.' });
      return;
    }

    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress: { ...progressDetails(progress), totalSteps: progress.totalSteps, attempts: progress.attempts, xpAwarded }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ success: false, message: 'Error updating progress' });
  }
};

export const getUserDashboard = async (req: Request, res: Response): Promise<void> => {
  const parsed = lessonLanguage.safeParse(req.params.language);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: invalidLanguage });
    return;
  }

  try {
    const language = parsed.data;
    const userId = req.user!.userId;
    const [userStats, recentProgress, totalLessons, completedLessons] = await Promise.all([
      getOrCreateUserStats(userId),
      Progress.find({ userId, language, status: { $ne: 'not_started' } })
        .sort({ lastAccessed: -1 }).limit(5)
        .populate<{ lessonId: Pick<ILesson, 'title' | 'difficulty'> | null }>('lessonId', 'title difficulty'),
      Lesson.countDocuments({ language, isActive: true }),
      Progress.countDocuments({ userId, language, status: { $in: completedStatuses } })
    ]);

    const stats = userStats[language];
    const totalXP = stats.totalXP || 0;
    const level = Math.max(1, Math.floor(totalXP / 100) + 1);
    const xpForNextLevel = level * 100;

    res.json({
      success: true,
      dashboard: {
        language,
        level,
        totalXP,
        xpForNextLevel,
        xpProgress: Math.max(0, totalXP - (level - 1) * 100),
        xpNeededForNext: Math.max(0, xpForNextLevel - totalXP),
        currentStreak: stats.streak || 0,
        completedLessons,
        totalLessons,
        timeSpent: Math.round((stats.timeSpent || 0) / 60),
        averageScore: stats.averageScore || 0,
        dailyGoal: userStats.preferences?.dailyGoal || 15,
        recentLessons: recentProgress.map(progress => ({
          title: progress.lessonId?.title || 'Lesson',
          difficulty: progress.lessonId?.difficulty || 'Beginner',
          timeSpent: Math.round((progress.timeSpent || 0) / 60),
          progress: progress.progress || 0,
          completed: progress.completed || false,
          score: progress.score || 0
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
};

export const generateLessonContentController = async (req: Request, res: Response): Promise<void> => {
  const parsed = generationInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid lesson generation request' });
    return;
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    res.status(503).json({ success: false, message: 'Lesson generation is unavailable' });
    return;
  }

  try {
    const { title, description, estimatedMinutes, steps, culturalNotes } = await generateLessonContent(parsed.data);
    const { language, difficulty } = parsed.data;
    const level = difficulty === 'Beginner' ? 1 : difficulty === 'Intermediate' ? 2 : 3;
    const lesson = await Lesson.create({
      title, description, estimatedMinutes, steps, culturalNotes, language, difficulty, level
    });
    res.status(201).json({
      success: true,
      message: 'Lesson content generated successfully',
      lesson,
      debug: {
        aiGenerated: true,
        stepsGenerated: lesson.steps.length,
        hasRealContent: lesson.steps.some(step =>
          step.content && step.content.word !== 'Example' && step.content.phrase !== 'Example phrase'
        )
      }
    });
  } catch (error) {
    console.error('Lesson generation failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate lesson content' });
  }
};
