import mongoose from 'mongoose';

interface LanguageStats {
  level: number;
  totalXP: number;
  streak: number;
  lessonsCompleted: number;
  averageScore: number;
  timeSpent: number;
  weakAreas: string[];
  strongAreas: string[];
  studyMore: StudyMoreStats;
  lessonStatsVersion?: number;
  lessonReceipts?: Map<string, { timeSpent: number; xpAwarded: boolean }>;
}

export interface IUserStats extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  spanish: LanguageStats;
  japanese: LanguageStats;
  preferences: {
    dailyGoal: number;
    reminderTime: string;
    difficultyPreference: 'adaptive' | 'challenging' | 'comfortable';
  };
  [key: string]: any;
}

interface StudyMoreStats {
  notesCreated: number;
  lessonSummaries: number;
  articlesCompleted: number;
  wordsLearned: number;
  currentWordStreak: number;
  totalReadingTime: number;
  lastWordDate?: Date;
}

const languageStatsFields = {
  level: { type: Number, default: 1 },
  totalXP: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lessonsCompleted: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  weakAreas: [String],
  strongAreas: [String],
  studyMore: {
    notesCreated: { type: Number, default: 0 },
    lessonSummaries: { type: Number, default: 0 },
    articlesCompleted: { type: Number, default: 0 },
    wordsLearned: { type: Number, default: 0 },
    currentWordStreak: { type: Number, default: 0 },
    totalReadingTime: { type: Number, default: 0 },
    lastWordDate: Date
  },
  lessonStatsVersion: Number,
  lessonReceipts: {
    type: Map,
    of: new mongoose.Schema({ timeSpent: Number, xpAwarded: Boolean }, { _id: false })
  }
};

const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  spanish: languageStatsFields,
  japanese: languageStatsFields,
  preferences: {
    dailyGoal: { type: Number, default: 15 },
    reminderTime: { type: String, default: '19:00' },
    difficultyPreference: {
      type: String,
      enum: ['adaptive', 'challenging', 'comfortable'],
      default: 'adaptive'
    }
  }
}, { timestamps: true });

const UserStats = mongoose.model<IUserStats>('UserStats', userStatsSchema);

export async function getOrCreateUserStats(userId: string | mongoose.Types.ObjectId) {
  return await UserStats.findOne({ userId }) ??
    UserStats.findOneAndUpdate({ userId }, {}, { new: true, upsert: true });
}

export default UserStats;
