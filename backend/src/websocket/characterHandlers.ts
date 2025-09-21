// Chat event handlers
import { Namespace, Socket } from "socket.io";
import { CharacterAIService } from "../services/characterAI.service";
import { ConversationManager } from "./conversationManager";
import { StreamingManager } from "./streamingManager";
import { ErrorRecoveryService } from "../services/errorRecovery.service";
import { RealTimeMonitor } from "../services/realTimeMonitor.service";
import { ElevenLabsService } from "../services/elevenlabs.service";
import { VrmAnimationService } from "../services/vrmAnimation.service";

const characterAI = new CharacterAIService();
const conversationManager = new ConversationManager();
const streamingManager = new StreamingManager();
const errorRecovery = new ErrorRecoveryService();
const realTimeMonitor = new RealTimeMonitor();
const elevenLabs = new ElevenLabsService();
const vrmAnimation = new VrmAnimationService();

/* ------------------------------------------------------------------ */
/*  Register all event listeners for the /character namespace         */
/* ------------------------------------------------------------------ */
export function registerCharacterHandlers(ns: Namespace) {
  ns.on("connection", (socket: Socket) => {
    const userId = socket.data.user?.userId || 'anonymous-' + socket.id;
    const safeUserId = userId; // Ensure safeUserId is available throughout the handler
    console.log(`🔗 Character WebSocket connected - User: ${safeUserId}, Socket: ${socket.id}`);

    /* ---------- 1. USER TEXT MESSAGE -------------------------------- */
    socket.on("user_message", async (payload: { text: string }) => {
      console.log(`📨 Received user message from ${userId}:`, payload.text);
      try {
        // Ensure userId is always defined
        const safeUserId = userId || 'anonymous-' + socket.id;
        // Start performance monitoring
        realTimeMonitor.startTimer(safeUserId);

        // Validate user input first
        const validation = errorRecovery.validateUserInput(payload.text);
        if (!validation.isValid) {
          const session = await conversationManager.getCurrentSession(safeUserId);
          const characterId = (session?.characterId || 'maria') as 'maria' | 'akira';
          const errorMessage = errorRecovery.getCharacterErrorMessage(characterId, validation.errorType as any);
          socket.emit("character_response", { text: errorMessage, isError: true });
          
          realTimeMonitor.trackError(safeUserId, 'input_validation');
          realTimeMonitor.endTimer(safeUserId, socket);
          return;
        }

        // Check connection health
        if (!realTimeMonitor.checkConnectionHealth(socket)) {
          realTimeMonitor.trackError(safeUserId, 'connection_issue');
          throw new Error('Connection health check failed');
        }

        // Track message in DB / memory
        const convoCtx = await conversationManager.appendUserMessage(
          safeUserId,
          payload.text
        );

        // Get current session to determine character - use the same logic as getOrCreateSession
        const session = await conversationManager.getCurrentSession(safeUserId);
        const characterId = session?.characterId || 'maria';

        console.log(`🎭 Using character: ${characterId} for user: ${safeUserId}`);

        // Emit typing indicator immediately
        socket.emit("character_thinking");

        const streamStartTime = Date.now();

        // Get enhanced streaming iterator from CharacterAI
        const stream = await characterAI.streamResponse({
          characterId: characterId as 'maria' | 'akira',
          userId: safeUserId,
          sessionId: session?._id?.toString() || '',
          conversationHistory: convoCtx as { role: "user" | "assistant"; content: string }[]
        });

        // Monitor streaming health during response
        const healthCheckInterval = setInterval(() => {
          realTimeMonitor.monitorStreamingHealth(socket, streamStartTime);
        }, 10000); // Check every 10 seconds

        // Pipe enhanced stream through StreamingManager  
        const fullText = await streamingManager.pipeEnhancedToSocket(stream, socket, "character_stream");

        // Clear health monitoring
        clearInterval(healthCheckInterval);

        // Persist character response
        await conversationManager.appendCharacterMessage(safeUserId, fullText);

        // Emit final response so frontend knows stream is complete
        socket.emit("character_response", { text: fullText });

        // Generate voice synthesis for character response
        try {
          console.log(`Checking voice synthesis for ${characterId}...`);
          
          // Check if ElevenLabs is properly configured
          const hasElevenLabsKey = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.length > 0;
          
          if (hasElevenLabsKey) {
            console.log(`Generating voice for ${characterId}: ${fullText.substring(0, 100)}...`);
            const voiceResult = await elevenLabs.generateWithLipSync(fullText, characterId as 'maria' | 'akira');
            
            if (voiceResult && voiceResult.audioUrl && voiceResult.audioUrl.length > 0) {
              socket.emit("voice_audio", {
                audioUrl: voiceResult.audioUrl,
                text: fullText,
                emotion: 'neutral' // TODO: Get emotion from previous analysis
              });
              console.log(`Voice synthesis completed for ${characterId}`);
            } else {
              console.log('Voice synthesis returned empty audio, skipping voice_audio event');
            }
          } else {
            console.log('ElevenLabs API key not configured, skipping voice synthesis');
          }
        } catch (voiceError) {
          console.error('Voice synthesis failed:', voiceError);
          // Continue without voice - don't break the conversation
        }

        // Generate VRM animation based on response emotion
        try {
          // Get character ID from session
          const session = await conversationManager.getCurrentSession(userId);
          const characterId = (session?.characterId || 'maria') as 'maria' | 'akira';
          
          // TODO: Extract emotion from response analysis
          const responseEmotion = 'happy'; // Default for now
          const animation = vrmAnimation.generateEmotionalAnimation(responseEmotion, characterId, 0.8);
          socket.emit("vrm_animation", animation);
        } catch (animationError) {
          console.error('VRM animation failed:', animationError);
          // Continue without animation - don't break the conversation
        }

        // End performance monitoring and log success
        const responseTime = realTimeMonitor.endTimer(userId, socket);
        console.log(`[SUCCESS] Response delivered to ${userId} in ${responseTime}ms`);
      } catch (err) {
        console.error("[socket] user_message error", err);
        
        // Track error for monitoring
        realTimeMonitor.trackError(userId, 'general_error');
        
        // Get character-specific error message
        const session = await conversationManager.getCurrentSession(userId).catch(() => null);
        const characterId = (session?.characterId || 'maria') as 'maria' | 'akira';
        const errorType = errorRecovery.categorizeError(err);
        const errorMessage = errorRecovery.getCharacterErrorMessage(characterId, errorType);
        
        // Try to provide fallback response
        try {
          const fallbackResponse = errorRecovery.createFallbackResponse(characterId, payload.text);
          socket.emit("character_response", { 
            ...fallbackResponse, 
            isError: true,
            fallback: true 
          });
          socket.emit("vrm_animation", fallbackResponse.animation);
        } catch (fallbackError) {
          // Ultimate fallback
          socket.emit("error", { message: errorMessage });
        }

        // End timer even on error
        realTimeMonitor.endTimer(safeUserId, socket);
      }
    });

    /* ---------- 2. CHARACTER SWITCH -------------------------------- */
    socket.on("switch_character", async (payload: { characterId: 'maria' | 'akira' }) => {
      console.log(`🔄 Character switch request from ${userId}:`, payload.characterId);
      try {
        const result = await conversationManager.switchCharacter(
          safeUserId,
          payload.characterId
        );
        socket.emit("character_switched", result);
        console.log(`✅ Character switched to ${payload.characterId} for user ${safeUserId}`);
      } catch (err) {
        console.error(`❌ Character switch failed for user ${safeUserId}:`, err);
        socket.emit("error", { message: "Could not switch character." });
      }
    });

    /* ---------- 3. LANGUAGE SWITCH ---------------------------------- */
    socket.on("switch_language", async (payload: { language: string }) => {
      console.log(`🌐 Language switch request from ${userId}:`, payload.language);
      try {
        const mode = await conversationManager.switchLanguage(
          safeUserId,
          payload.language
        );
        socket.emit("language_switched", { mode });
        console.log(`✅ Language switched to ${payload.language} for user ${safeUserId}`);
      } catch (err) {
        console.error(`❌ Language switch failed for user ${safeUserId}:`, err);
        socket.emit("error", { message: "Could not switch language." });
      }
    });

    /* ---------- 4. SESSION DISCONNECT ------------------------------- */
    socket.on("disconnect", () => {
      console.log(`🔌 Character WebSocket disconnected - User: ${userId}, Socket: ${socket.id}`);
      conversationManager.endSession(userId).catch(console.error);
    });
  });
}
