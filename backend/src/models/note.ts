import mongoose from 'mongoose';

export const NOTE_LANGUAGES = ['spanish', 'japanese'] as const;
export const NOTE_TOPICS = ['Grammar', 'Vocabulary', 'Culture', 'Pronunciation', 'Beginner', 'Intermediate', 'Advanced'] as const;
export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_CONTENT_MAX_LENGTH = 10000;

export interface INote extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  derivedTitle?: boolean;
  readingId?: mongoose.Types.ObjectId;
  revision?: number;
  writeId?: string;
  content: string;
  language: typeof NOTE_LANGUAGES[number];
  topic?: typeof NOTE_TOPICS[number];
  tags: string[];
  aiGenerated: boolean;
  lessonId?: mongoose.Types.ObjectId;
  summaryKey?: string;
  starred: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const noteSchema = new mongoose.Schema({
  derivedTitle: Boolean,
  readingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReadingArticle' },
  revision: Number,
  writeId: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: NOTE_TITLE_MAX_LENGTH
  },
  content: {
    type: String,
    default: '',
    maxlength: NOTE_CONTENT_MAX_LENGTH
  },
  language: {
    type: String,
    enum: NOTE_LANGUAGES,
    required: true
  },
  topic: {
    type: String,
    trim: true,
    enum: NOTE_TOPICS
  },
  tags: [{
    type: String,
    trim: true
  }],
  aiGenerated: {
    type: Boolean,
    default: false
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  summaryKey: {
    type: String,
    select: false
  },
  starred: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

noteSchema.index({ userId: 1, language: 1 });
noteSchema.index({ userId: 1, starred: 1 });
noteSchema.index({ userId: 1, topic: 1 });
noteSchema.index({ userId: 1, createdAt: -1 });
// Only new summaries have a key, so building the index preserves any legacy duplicates.
noteSchema.index({ summaryKey: 1 }, { unique: true, sparse: true });

export default mongoose.model<INote>('Note', noteSchema);
