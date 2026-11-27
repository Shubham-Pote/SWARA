import mongoose from 'mongoose';
import { READING_LANGUAGES, type IReadingArticle } from './readingArticle';

export interface IReadingProgress extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  articleId: mongoose.Types.ObjectId;
  language: IReadingArticle['language'];
  status: 'not_started' | 'reading' | 'completed';
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number; // in seconds
  quizScore: number; // percentage 0-100
  quizCorrectAnswers?: number;
  quizAttempts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const readingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReadingArticle',
    required: true
  },
  language: {
    type: String,
    enum: READING_LANGUAGES,
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'reading', 'completed'],
    default: 'not_started'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  quizScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  quizCorrectAnswers: { type: Number, min: 0 },
  quizAttempts: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// Indexes for performance
readingProgressSchema.index({ userId: 1, language: 1 });
readingProgressSchema.index({ userId: 1, articleId: 1 }, { unique: true });
readingProgressSchema.index({ status: 1 });

export default mongoose.model<IReadingProgress>('ReadingProgress', readingProgressSchema);
