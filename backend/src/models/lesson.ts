import mongoose from 'mongoose';

export interface ILesson extends mongoose.Document {
  title: string;
  description: string;
  language: 'spanish' | 'japanese';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  level: number;
  estimatedMinutes: number;
  xpReward: number;
  prerequisites: mongoose.Types.ObjectId[];
  order: number;
  steps: IStep[];
  culturalNotes?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IStep {
  stepNumber: number;
  type: 'vocabulary' | 'phrase' | 'dialogue' | 'practice' | 'grammar' | 'listening' | 'cultural_note' | 'introduction' | 'review';
  title: string;
  content: {
    word?: string;
    phrase?: string;
    translation?: string;
    pronunciation?: string;
    audio?: string;
    example?: string;
    notes?: string;
    dialogue?: Array<{
      speaker: string;
      text: string;
      translation?: string;
      pronunciation?: string;
    }>;
    exercises?: Array<{
      id: string;
      type: string;
      question: string;
      options?: string[];
      answer?: string;
      correctAnswer?: string;
      explanation: string;
      points?: number;
    }>;
  };
}

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  language: { 
    type: String, 
    enum: ['spanish', 'japanese'], 
    required: true 
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  level: { type: Number, min: 1, max: 5, required: true },
  estimatedMinutes: { type: Number, required: true },
  xpReward: { type: Number, default: 50 },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  order: { type: Number, default: 0 },
  steps: [{
    stepNumber: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        'vocabulary',
        'phrase', 
        'dialogue',
        'practice',
        'grammar',
        'listening',
        'cultural_note',
        'introduction',
        'review'
      ],
      required: true
    },
    title: { type: String, required: true },
    content: {
      word: String,
      phrase: String,
      translation: String,
      pronunciation: String,
      audio: String,
      example: String,
      notes: String,
      dialogue: [{
        speaker: { type: String, required: true },
        text: { type: String, required: true },
        translation: String,
        pronunciation: String
      }],
      exercises: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        question: { type: String, required: true },
        options: [String],
        answer: String,
        correctAnswer: String,
        explanation: { type: String, required: true },
        points: Number
      }]
    }
  }],
  culturalNotes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

lessonSchema.index({ language: 1, isActive: 1, order: 1, level: 1 });

export default mongoose.model<ILesson>('Lesson', lessonSchema);
