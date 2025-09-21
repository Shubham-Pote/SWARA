// Active session tracking
import { Schema, model, Types, Document } from "mongoose";

export interface ICharacterSession extends Document {
  userId: string; // Changed from Types.ObjectId to string for compatibility
  characterId: string; // 'maria' | 'akira'
  language: "es" | "ja" | "mixed";
  personality: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  conversationContext?: any;
  learningProgress?: {
    wordsLearned: number;
    phrasesUsed: number;
    culturalContextsEncountered: number;
    emotionalStatesExperienced: string[];
  };
  sessionStats?: {
    totalMessages: number;
    userMessages: number;
    characterMessages: number;
    averageResponseTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const characterSessionSchema = new Schema<ICharacterSession>(
  {
    userId: { type: String, required: true }, // Changed from ObjectId to String
    characterId: { 
      type: String, 
      enum: ["maria", "akira"], 
      required: true 
    },
    language: { 
      type: String, 
      enum: ["es", "ja", "mixed"], 
      default: "mixed" 
    },
    personality: { 
      type: String, 
      default: "friendly" 
    },
    startTime: { 
      type: Date, 
      default: Date.now 
    },
    endTime: Date,
    isActive: { 
      type: Boolean, 
      default: true 
    },
    conversationContext: Schema.Types.Mixed,
    learningProgress: {
      wordsLearned: { type: Number, default: 0 },
      phrasesUsed: { type: Number, default: 0 },
      culturalContextsEncountered: { type: Number, default: 0 },
      emotionalStatesExperienced: [String]
    },
    sessionStats: {
      totalMessages: { type: Number, default: 0 },
      userMessages: { type: Number, default: 0 },
      characterMessages: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// Indexes for better performance
characterSessionSchema.index({ userId: 1, isActive: 1 });
characterSessionSchema.index({ characterId: 1 });
characterSessionSchema.index({ startTime: -1 });

export default model<ICharacterSession>(
  "CharacterSession",
  characterSessionSchema
);
