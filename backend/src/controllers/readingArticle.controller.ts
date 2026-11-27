import { Request, Response } from 'express';
import { isObjectIdOrHexString, Types } from 'mongoose';
import { z } from 'zod';
import ReadingArticle, { IReadingArticle, READING_LANGUAGES } from '../models/readingArticle';
import ReadingProgress, { IReadingProgress } from '../models/readingProgress';
import UserStats from '../models/userStats';
import { generateReadingArticle } from '../services/aiArticleGeneration.service';
import { countConsecutiveCompletionDays } from '../utils/completionStreak';

type ReadingLanguage = IReadingArticle['language'];
const readingLanguage = z.enum(READING_LANGUAGES);
const openStatuses = ['not_started', 'reading'];
const passingScore = 70;
const quizInput = z.object({
  answers: z.array(z.number().int().nonnegative()),
  timeSpent: z.number().finite().nonnegative().default(0)
});

function visibleArticles(userId: string) {
  return { $or: [{ generatedFor: userId }, { generatedFor: null }] };
}

function articleProgressWithDetails(userId: string, language: ReadingLanguage, currentOnly = false) {
  return ReadingProgress.find({
    userId,
    language,
    ...(currentOnly && { status: { $in: openStatuses } })
  })
    .sort({ createdAt: -1, _id: -1 })
    .populate<{ articleId: IReadingArticle | null }>({
      path: 'articleId', match: visibleArticles(userId)
    });
}

function readingProgressDetails({ status, timeSpent, startedAt }: Pick<IReadingProgress, 'status' | 'timeSpent' | 'startedAt'>) {
  return { status, timeSpent, startedAt };
}

export const getUserArticles = async (req: Request, res: Response): Promise<void> => {
  const language = readingLanguage.safeParse(req.params.language);
  if (!language.success) {
    res.status(400).json({ success: false, message: 'Invalid reading language' });
    return;
  }

  try {
    const history = (await articleProgressWithDetails(req.user!.userId, language.data))
      .filter(progress => progress.articleId);
    const current = history.find(progress => openStatuses.includes(progress.status));
    const completedArticles = history.filter(progress => progress.status === 'completed').map(progress => ({
      article: progress.articleId,
      progress: {
        status: progress.status,
        timeSpent: progress.timeSpent,
        completedAt: progress.completedAt,
        quizScore: progress.quizScore,
        quizAttempts: progress.quizAttempts
      }
    }));

    res.json({
      success: true,
      currentArticle: current ? {
        article: current.articleId,
        progress: { ...readingProgressDetails(current), quizScore: current.quizScore }
      } : null,
      completedArticles,
      totalCompleted: completedArticles.length
    });
  } catch (error) {
    console.error('Get user articles error:', error);
    res.status(500).json({ success: false, message: 'Failed to get articles' });
  }
};

export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  const { articleId } = req.params;
  if (!isObjectIdOrHexString(articleId)) {
    res.status(400).json({ success: false, message: 'Invalid article ID' });
    return;
  }

  try {
    const userId = req.user!.userId;
    const article = await ReadingArticle.findOne({ _id: articleId, ...visibleArticles(userId) });
    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    const progress = await ReadingProgress.findOne({ userId, articleId });
    res.json({ success: true, article, progress });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ success: false, message: 'Failed to get article' });
  }
};

async function assignArticle(userId: string, language: ReadingLanguage, completedArticles: number) {
  const generationKey = `${userId.toLowerCase()}:${language}:${completedArticles}`;
  let article = await ReadingArticle.findOne({ generationKey });

  if (!article) {
    if (!process.env.GEMINI_API_KEY?.trim()) return null;
    await ReadingArticle.init();
    const userStats = await UserStats.findOne({ userId }).select(`${language}.level`);
    const userLevel = userStats?.[language]?.level || 1;
    const articleData = await generateReadingArticle(language, userLevel, completedArticles);
    if (!articleData) return null;
    const { aiGenerated, ...content } = articleData;
    const now = new Date();
    article = await ReadingArticle.findOneAndUpdate(
      { generationKey },
      {
        $setOnInsert: {
          ...content,
          generatedFor: userId,
          isStarterArticle: completedArticles === 0,
          generationMetadata: { aiGenerated, generatedAt: now, userLevel, completedArticles },
          createdAt: now,
          updatedAt: now
        }
      },
      { new: true, upsert: true, runValidators: true, timestamps: false }
    );
  }

  if (!article) throw new Error('Article generation upsert returned no article');
  // The saved article can be assigned on retry if writing its progress was interrupted.
  await ReadingProgress.init();
  const now = new Date();
  const result = await ReadingProgress.findOneAndUpdate(
    { userId, articleId: article._id },
    { $setOnInsert: { language, status: 'not_started', startedAt: now, createdAt: now, updatedAt: now } },
    { new: true, upsert: true, includeResultMetadata: true, runValidators: true, timestamps: false }
  );

  if (!result.value) throw new Error('Article assignment returned no progress');
  return { article, progress: result.value, isNew: Boolean(result.lastErrorObject?.upserted) };
}

async function findOpenArticle(userId: string, language: ReadingLanguage) {
  return (await articleProgressWithDetails(userId, language, true)).find(progress => progress.articleId);
}

export const getCurrentArticle = async (req: Request, res: Response): Promise<void> => {
  const language = readingLanguage.safeParse(req.params.language);
  if (!language.success) {
    res.status(400).json({ success: false, message: 'Invalid reading language' });
    return;
  }

  try {
    const userId = req.user!.userId;
    const current = await findOpenArticle(userId, language.data);
    if (current) {
      res.json({
        success: true, article: current.articleId, progress: readingProgressDetails(current), isNew: false
      });
      return;
    }

    const completed = await ReadingProgress.countDocuments({ userId, language: language.data, status: 'completed' });
    const assignment = await assignArticle(userId, language.data, completed);
    if (!assignment) {
      res.set('Retry-After', '15').status(503).json({ success: false, message: 'New readings are temporarily unavailable. Try again in a moment.' });
      return;
    }
    if (assignment.progress.status === 'completed') {
      res.status(409).json({ success: false, message: 'Reading progress changed. Refresh to see your current article.' });
      return;
    }

    res.json({
      success: true,
      article: assignment.article,
      progress: readingProgressDetails(assignment.progress),
      isNew: assignment.isNew,
      isStarter: assignment.article.isStarterArticle
    });
  } catch (error) {
    console.error('Get current article error:', error);
    res.status(500).json({ success: false, message: 'Failed to get current article' });
  }
};

export const startReading = async (req: Request, res: Response): Promise<void> => {
  const { articleId } = req.params;
  if (!isObjectIdOrHexString(articleId)) {
    res.status(400).json({ success: false, message: 'Invalid article ID' });
    return;
  }

  try {
    const userId = req.user!.userId;
    const key = { userId, articleId };
    const progress = await ReadingProgress.findOneAndUpdate(
      { ...key, status: { $in: ['not_started', null] } },
      { $set: { status: 'reading', startedAt: new Date() } },
      { new: true }
    ) ?? await ReadingProgress.findOne(key);

    if (!progress) {
      res.status(404).json({ success: false, message: 'Reading progress not found' });
      return;
    }

    res.json({ success: true, message: 'Reading started', progress: readingProgressDetails(progress) });
  } catch (error) {
    console.error('Start reading error:', error);
    res.status(500).json({ success: false, message: 'Failed to start reading' });
  }
};

async function syncCompletedArticles(userId: string, language: ReadingLanguage) {
  try {
    const completed = await ReadingProgress.countDocuments({ userId, language, status: 'completed' });
    await UserStats.updateOne(
      { userId },
      { $max: { [`${language}.studyMore.articlesCompleted`]: completed } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating reading stats:', error);
  }
}

export const completeArticle = async (req: Request, res: Response): Promise<void> => {
  const { articleId } = req.params;
  if (!isObjectIdOrHexString(articleId)) {
    res.status(400).json({ success: false, message: 'Invalid article ID' });
    return;
  }

  const parsed = quizInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid quiz answers or reading time' });
    return;
  }

  try {
    const userId = req.user!.userId;
    const article = await ReadingArticle.findOne({ _id: articleId, ...visibleArticles(userId) });
    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' });
      return;
    }

    const { answers, timeSpent } = parsed.data;
    const questions = article.comprehensionQuestions ?? [];
    const totalQuestions = questions.length;
    if (answers.length !== totalQuestions || answers.some((answer, index) => answer >= (questions[index]?.options?.length ?? 0))) {
      res.status(400).json({ success: false, message: 'Answer each quiz question with a valid option' });
      return;
    }

    const correctAnswers = answers.filter((answer, index) => questions[index].correctAnswer === answer).length;
    const score = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 100;
    const passed = score >= passingScore;
    const key = { userId, articleId };
    const progress = await ReadingProgress.findOneAndUpdate(
      { ...key, status: { $ne: 'completed' } },
      {
        $set: {
          status: passed ? 'completed' : 'reading',
          timeSpent,
          quizScore: score,
          quizCorrectAnswers: correctAnswers,
          ...(passed && { completedAt: new Date() })
        },
        $inc: { quizAttempts: 1 }
      },
      { new: true }
    ) ?? await ReadingProgress.findOne(key);

    if (!progress) {
      res.status(404).json({ success: false, message: 'Reading progress not found' });
      return;
    }

    const completed = progress.status === 'completed';
    if (completed) await syncCompletedArticles(userId, progress.language);

    res.json({
      success: true,
      results: {
        score: progress.quizScore,
        correctAnswers: progress.quizCorrectAnswers ?? Math.round(progress.quizScore * totalQuestions / 100),
        totalQuestions,
        passed: completed,
        timeSpent: progress.timeSpent,
        canGenerateNext: completed
      },
      message: completed ? 'Great job! You can now generate your next article!' : 'Keep practicing! Try again to unlock the next article.'
    });
  } catch (error) {
    console.error('Complete article error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete article' });
  }
};

export const generateNextArticle = async (req: Request, res: Response): Promise<void> => {
  const language = readingLanguage.safeParse(req.params.language);
  if (!language.success) {
    res.status(400).json({ success: false, message: 'Invalid reading language' });
    return;
  }

  try {
    const userId = req.user!.userId;
    if (await findOpenArticle(userId, language.data)) {
      res.status(400).json({ success: false, message: 'You already have an article in progress' });
      return;
    }

    const filter = { userId, language: language.data, status: 'completed' };
    const lastCompleted = await ReadingProgress.findOne(filter).sort({ createdAt: -1, _id: -1 });
    if (!lastCompleted || (lastCompleted.quizScore || 0) < passingScore) {
      res.status(400).json({ success: false, message: 'Complete your current article with a passing score first' });
      return;
    }

    const completed = await ReadingProgress.countDocuments(filter);
    const assignment = await assignArticle(userId, language.data, completed);
    if (!assignment) {
      res.set('Retry-After', '15').status(503).json({ success: false, message: 'New readings are temporarily unavailable. Try again in a moment.' });
      return;
    }
    if (assignment.progress.status === 'completed') {
      res.status(409).json({ success: false, message: 'Reading progress changed. Refresh to see your current article.' });
      return;
    }

    res.json({
      success: true,
      message: 'New personalized article generated!',
      article: assignment.article,
      progress: readingProgressDetails(assignment.progress)
    });
  } catch (error) {
    console.error('Generate next article error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate next article' });
  }
};

export const getReadingStats = async (req: Request, res: Response): Promise<void> => {
  const language = readingLanguage.safeParse(req.params.language);
  if (!language.success) {
    res.status(400).json({ success: false, message: 'Invalid reading language' });
    return;
  }

  try {
    const match = { userId: new Types.ObjectId(req.user!.userId), language: language.data, status: 'completed' };
    const [[totals], completed] = await Promise.all([
      ReadingProgress.aggregate<{ count: number; averageScore: number | null; totalTime: number }>([
        { $match: match },
        { $group: { _id: null, count: { $sum: 1 }, averageScore: { $avg: '$quizScore' }, totalTime: { $sum: '$timeSpent' } } }
      ]),
      ReadingProgress.find(match).select('completedAt').sort({ completedAt: -1 }).lean()
    ]);

    res.json({
      success: true,
      stats: {
        totalCompleted: totals?.count ?? 0,
        averageScore: Math.round(totals?.averageScore ?? 0),
        totalTimeSpent: Math.round((totals?.totalTime ?? 0) / 60),
        currentStreak: countConsecutiveCompletionDays(completed),
        language: language.data
      }
    });
  } catch (error) {
    console.error('Get reading stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reading statistics' });
  }
};
