import mongoose from 'mongoose';

export interface IProgress extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  language: 'japanese' | 'spanish';
  status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  currentStep: number;
  lastSubmittedStep?: number;
  totalSteps: number;
  score: number;
  timeSpent: number;
  attempts: number;
  mistakes: string[];
  lastAccessed: Date;
  completedAt?: Date;
  xpAwarded: boolean;
  statsSync: {
    timeSpent: number;
    xpReward?: number;
    score?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
  
  progress: number;
  completed: boolean;
}

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  language: {
    type: String,
    enum: ['japanese', 'spanish'],
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'mastered'],
    default: 'not_started'
  },
  currentStep: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lastSubmittedStep: Number,
  totalSteps: {
    type: Number,
    default: 5,
    min: 1
  },
  score: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  },
  timeSpent: { 
    type: Number, 
    default: 0,
    min: 0
  },
  attempts: { 
    type: Number, 
    default: 1,
    min: 1
  },
  mistakes: {
    type: [String],
    default: []
  },
  lastAccessed: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: {
    type: Date
  },
  xpAwarded: {
    type: Boolean,
    default: false
  },
  statsSync: {
    timeSpent: { type: Number, default: 0 },
    xpReward: Number,
    score: Number
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});

// Virtual for progress percentage
progressSchema.virtual('progress').get(function() {
  if (this.status === 'completed' || this.status === 'mastered') return 100;
  return this.totalSteps > 0 ? Math.min(100, Math.round((this.currentStep / this.totalSteps) * 100)) : 0;
});

// Virtual for completed status
progressSchema.virtual('completed').get(function() {
  return this.status === 'completed' || this.status === 'mastered';
});

progressSchema.set('toJSON', { virtuals: true });
progressSchema.set('toObject', { virtuals: true });

// Compound indexes
progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
progressSchema.index({ userId: 1, language: 1 });

export default mongoose.model<IProgress>('Progress', progressSchema);
