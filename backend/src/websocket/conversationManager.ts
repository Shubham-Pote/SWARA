// Conversation state management
import CharacterConversation from "../models/characterConversation"; // 🆕 schema
import CharacterSession from "../models/characterSession";           // 🆕 schema
import { Types } from "mongoose";

const MAX_HISTORY = 20; // messages per side kept in memory

export class ConversationManager {
  async appendUserMessage(userId: string, text: string) {
    const session = await this.getOrCreateSession(userId);

    await CharacterConversation.create({
      sessionId: session._id,  // Use correct field name
      sender: "user",         // Use correct field name
      message: text           // Use correct field name
    });

    return this.buildContext(session._id);
  }

  async appendCharacterMessage(userId: string, text: string) {
    const session = await this.getOrCreateSession(userId);

    await CharacterConversation.create({
      sessionId: session._id,  // Use correct field name
      sender: "character",     // Use correct field name
      message: text            // Use correct field name
    });
  }

  async switchLanguage(userId: string, language: string) {
    const session = await this.getOrCreateSession(userId);
    // Cast to specific type to fix TypeScript error
    session.language = language as "es" | "ja" | "mixed";
    await session.save();
    return session.language;
  }

  async switchCharacter(userId: string, characterId: 'maria' | 'akira') {
    const session = await this.getOrCreateSession(userId);
    session.characterId = characterId;
    // Also update language based on character
    session.language = characterId === 'akira' ? 'ja' : 'es';
    await session.save();
    return { characterId: session.characterId, language: session.language };
  }

  async endSession(userId: string) {
    await CharacterSession.deleteMany({ userId: userId });
  }

  async getCurrentSession(userId: string) {
    // Always fetch fresh from database to avoid stale data
    let session = await CharacterSession.findOne({ userId: userId });
    if (!session) {
      session = await CharacterSession.create({
        userId: userId,
        characterId: "maria", // default character
        language: "es", // default María's language
        isActive: true // Ensure isActive is set
      });
    }
    return session;
  }

  /* -------------------- helpers -------------------- */
  private async getOrCreateSession(userId: string) {
    let session = await CharacterSession.findOne({ userId: userId });
    if (!session) {
      session = await CharacterSession.create({
        userId: userId,
        characterId: "maria", // default character
        language: "es", // default María's language
        isActive: true // Ensure isActive is set
      });
    }
    return session;
  }

  private async buildContext(sessionId: Types.ObjectId) {
    const messages = await CharacterConversation
      .find({ sessionId: sessionId })  // Use correct field name from model
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY * 2) // user+character pairs
      .lean();

    // reverse to chronological order
    return messages.reverse().map(m => ({
      role: m.sender === "user" ? "user" : "assistant",  // Use 'sender' from model
      content: m.message  // Use 'message' from model
    }));
  }
}
