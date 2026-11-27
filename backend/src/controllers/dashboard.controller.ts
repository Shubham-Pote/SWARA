import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import CompanionTurn from '../models/companionTurn';
import Lesson from '../models/lesson';
import Progress from '../models/progress';
import ReadingArticle from '../models/readingArticle';
import ReadingProgress from '../models/readingProgress';
import UserStats from '../models/userStats';

type ActivityKind = 'exchange' | 'lesson' | 'reading';
const dayMs = 86_400_000;

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const { language } = req.params;
  if (language !== 'spanish' && language !== 'japanese') {
    res.status(400).json({ message: 'Choose Spanish or Japanese.' });
    return;
  }

  const match = { userId: new Types.ObjectId(req.user!.userId), language };
  const now = new Date();
  const today = Math.floor(now.getTime() / dayMs);
  const currentDay = new Date(today * dayMs);
  try {
    const [[activity], stats] = await Promise.all([
      CompanionTurn.aggregate<{
        days: { _id: Date }[];
        counts: { _id: ActivityKind; total: number }[];
        recent: { kind: ActivityKind; at: Date; title: string | null; articleId?: Types.ObjectId }[];
      }>([
        { $match: match },
        { $project: { kind: { $literal: 'exchange' }, at: { $toDate: '$_id' } } },
        { $unionWith: { coll: Progress.collection.name, pipeline: [
          { $match: { ...match, status: { $in: ['completed', 'mastered'] } } },
          { $project: { kind: { $literal: 'lesson' }, at: '$completedAt', itemId: '$lessonId' } }
        ] } },
        { $unionWith: { coll: ReadingProgress.collection.name, pipeline: [
          { $match: { ...match, status: 'completed' } },
          { $project: { kind: { $literal: 'reading' }, at: '$completedAt', itemId: '$articleId' } }
        ] } },
        { $facet: {
          days: [
            { $match: { at: { $type: 'date', $lte: now } } },
            { $group: { _id: { $dateTrunc: { date: '$at', unit: 'day', timezone: 'UTC' } } } },
            { $sort: { _id: 1 } }
          ],
          counts: [{ $group: { _id: '$kind', total: { $sum: 1 } } }],
          recent: [
            { $match: { at: { $type: 'date', $lte: now } } },
            { $sort: { at: -1, _id: -1 } },
            { $limit: 5 },
            { $lookup: { from: Lesson.collection.name, localField: 'itemId', foreignField: '_id', as: 'lesson' } },
            { $lookup: { from: ReadingArticle.collection.name, localField: 'itemId', foreignField: '_id', as: 'reading' } },
            { $project: {
              _id: 0, kind: 1, at: 1,
              articleId: { $cond: [{ $eq: ['$kind', 'reading'] }, { $arrayElemAt: ['$reading._id', 0] }, '$$REMOVE'] },
              title: { $switch: {
                branches: [
                  { case: { $eq: ['$kind', 'lesson'] }, then: { $arrayElemAt: ['$lesson.title', 0] } },
                  { case: { $eq: ['$kind', 'reading'] }, then: { $arrayElemAt: ['$reading.title', 0] } }
                ],
                default: null
              } }
            } }
          ]
        } }
      ]),
      UserStats.findOne({ userId: match.userId }).select(`${language}.totalXP`).lean()
    ]);

    const days = (activity?.days ?? []).map(day => day._id.getTime() / dayMs);
    let run = 0;
    let bestStreak = 0;
    let previous = -Infinity;
    for (const day of days) {
      run = day === previous + 1 ? run + 1 : 1;
      bestStreak = Math.max(bestStreak, run);
      previous = day;
    }
    const total = (kind: ActivityKind) => activity?.counts.find(count => count._id === kind)?.total ?? 0;
    res.set('Cache-Control', 'private, no-store').json({
      today: currentDay.toISOString().slice(0, 10),
      activeDays: days.filter(day => day >= today - 6).map(day => new Date(day * dayMs).toISOString().slice(0, 10)),
      streak: previous >= today - 1 ? run : 0,
      bestStreak,
      exchanges: total('exchange'),
      lessons: total('lesson'),
      readings: total('reading'),
      xp: Math.max(0, stats?.[language]?.totalXP ?? 0),
      recent: activity?.recent ?? []
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ message: 'Could not load your learning activity.' });
  }
}
