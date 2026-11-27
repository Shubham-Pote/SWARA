import { Schema, model } from 'mongoose';

const turn = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  language: { type: String, enum: ['spanish', 'japanese'], required: true },
  conversationId: Schema.Types.ObjectId,
  question: { type: String, required: true },
  reply: { type: String, required: true }
});
turn.index({ userId: 1, language: 1, _id: -1 });
turn.index({ userId: 1, language: 1, conversationId: 1, _id: -1 });

export default model('CompanionTurn', turn);
