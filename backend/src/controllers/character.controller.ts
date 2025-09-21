// Character conversation APIs
import { Request, Response } from "express";
import mongoose from "mongoose";
import CharacterConversation from "../models/characterConversation";
import CharacterSession from "../models/characterSession";
import CharacterPersonality from "../models/characterPersonality";
import { EmotionAnalysisService } from "../services/emotionAnalysis.service";
import { MultiLanguageDetectionService } from "../services/multiLanguageDetection.service";
import { CharacterAIService } from "../services/characterAI.service";
import { VrmAnimationService } from "../services/vrmAnimation.service";
import { CulturalContextService } from "../services/culturalContext.service";
import { TranslationService } from "../services/translation.service";
import { GeminiAudioStreamService } from "../services/geminiAudio.service";

const emotionService = new EmotionAnalysisService();
const languageService = new MultiLanguageDetectionService();
const characterAI = new CharacterAIService();
const vrmAnimation = new VrmAnimationService();
const culturalContext = new CulturalContextService();
const translation = new TranslationService();
const geminiAudioService = new GeminiAudioStreamService();

export const getHistory = async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const userId = (req as any).user?.userId; // Fixed: use userId instead of id
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const session = await CharacterSession.findOne({ 
      userId, 
      isActive: true 
    }).sort({ startTime: -1 });
    
    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    const messages = await CharacterConversation
      .find({ sessionId: session._id })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: {
        session,
        messages: messages.reverse()
      }
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const clearHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId; // Fixed: use userId instead of id
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Find user's sessions and clear their conversations
    const sessions = await CharacterSession.find({ userId });
    const sessionIds = sessions.map(s => s._id);
    
    await CharacterConversation.deleteMany({ 
      sessionId: { $in: sessionIds } 
    });

    res.json({ 
      success: true,
      message: "History cleared successfully" 
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const startConversation = async (req: Request, res: Response) => {
  try {
    const { characterId = 'maria', language = 'mixed', personality = 'friendly' } = req.body;
    const userId = (req as any).user?.userId; // Fixed: use userId instead of id

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // End any existing active sessions
    await CharacterSession.updateMany(
      { userId, isActive: true },
      { isActive: false, endTime: new Date() }
    );

    // Create new session
    const session = await CharacterSession.create({
      userId,
      characterId,
      language,
      personality,
      startTime: new Date(),
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: { session }
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;
    const userId = (req as any).user?.userId; // Fixed: use userId instead of id

    console.log('Send message request:', { sessionId, message, userId });

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Verify session belongs to user
    const session = await CharacterSession.findOne({ 
      _id: new mongoose.Types.ObjectId(sessionId), 
      userId, 
      isActive: true 
    });

    console.log('Session search result:', session ? 'FOUND' : 'NOT FOUND');
    console.log('Searching for session with ID:', sessionId, 'and userId:', userId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: "Session not found or inactive" 
      });
    }

    // Detect languages and emotions
    const detectedLanguages = await languageService.detectLanguages(message);
    const emotions = await emotionService.analyzeEmotion(message);

    // Cultural context analysis
    const culturalNote = culturalContext.generateCulturalNote(
      message,
      detectedLanguages,
      session.characterId as 'maria' | 'akira'
    );

    // Translation assistance if needed
    let translationHelp = null;
    if (detectedLanguages.some(d => d.language !== session.language)) {
      try {
        translationHelp = await translation.translateWithCharacter(
          message,
          session.characterId as 'maria' | 'akira',
          'beginner'
        );
      } catch (translationError) {
        console.warn('Translation failed:', translationError);
      }
    }

    // Get recent conversation history for context
    const recentMessages = await CharacterConversation
      .find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    // Get character personality for AI response
    const personality = await CharacterPersonality.findOne({ characterId: session.characterId });

    // Generate AI response with streaming
    let characterResponse = '';
    if (personality) {
      try {
        // Create context for streaming
        const conversationHistory = recentMessages.reverse().map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant' as 'user' | 'assistant',
          content: msg.message
        }));

        const streamContext = {
          characterId: session.characterId as 'maria' | 'akira',
          userId: session.userId.toString(),
          sessionId: sessionId,
          conversationHistory: conversationHistory
        };

        const stream = await characterAI.streamResponse(streamContext);
        characterResponse = await stream.fullText();
      } catch (aiError) {
        console.warn('AI response generation failed, using fallback:', aiError);
        characterResponse = session.characterId === 'akira' 
          ? 'こんにちは！日本語を学んでいますね。すばらしいです！'
          : '¡Hola! ¡Qué bueno verte practicando español!';
      }
    } else {
      // Fallback response
      characterResponse = session.characterId === 'akira' 
        ? 'こんにちは！日本語を学んでいますね。すばらしいです！'
        : '¡Hola! ¡Qué bueno verte practicando español!';
    }

    // Generate VRM animation state
    let animationData = null;
    try {
      animationData = vrmAnimation.generateEmotionalAnimation(
        emotions[0]?.emotion || 'neutral',
        session.characterId as 'maria' | 'akira',
        emotions[0]?.intensity || 0.5
      );
    } catch (animError) {
      console.warn('Animation generation failed:', animError);
    }

    // Audio will be streamed via WebSocket in real-time
    let voiceData = null;
    try {
      // Gemini audio streaming happens in WebSocket handlers
      console.log('Audio streaming prepared for Gemini 2.5');
    } catch (voiceError) {
      console.warn('Voice generation failed:', voiceError);
    }

    // Save user message
    const userMessage = await CharacterConversation.create({
      sessionId,
      sender: 'user',
      message,
      detectedLanguages,
      emotions,
      timestamp: new Date()
    });

    // Save enhanced character response
    const characterMessage = await CharacterConversation.create({
      sessionId,
      sender: 'character',
      message: characterResponse,
      detectedLanguages: [{ 
        language: session.characterId === 'akira' ? 'japanese' : 'spanish', 
        confidence: 0.95 
      }],
      emotions: [{ emotion: emotions[0]?.emotion || 'encouraging', intensity: 0.8, confidence: 0.9 }],
      animationData: animationData,
      voiceData: voiceData,
      culturalContext: culturalNote?.text || null,
      translationData: translationHelp,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        userMessage,
        characterResponse: characterMessage,
        animation: animationData,
        voice: voiceData,
        culturalContext: culturalNote,
        translation: translationHelp,
        emotion: emotions[0]
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const endConversation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId; // Fixed: use userId instead of id

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const session = await CharacterSession.findOneAndUpdate(
      { _id: sessionId, userId },
      { isActive: false, endTime: new Date() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: "Session not found" 
      });
    }

    res.json({
      success: true,
      message: 'Conversation ended successfully',
      data: { session }
    });
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
