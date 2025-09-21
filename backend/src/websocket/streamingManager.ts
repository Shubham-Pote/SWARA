// Gemini streaming management
import { Socket } from "socket.io";

export class StreamingManager {
  async pipeToSocket(
    stream: AsyncIterable<string>,
    socket: Socket,
    event: string
  ) {
    let lastSent = 0;

    for await (const chunk of stream) {
      socket.emit(event, { chunk });

      // every 2s send keep-alive to extend “thinking” animation
      const now = Date.now();
      if (now - lastSent > 2_000) {
        socket.emit("character_thinking");
        lastSent = now;
      }
    }
  }

  async pipeEnhancedToSocket(
    stream: AsyncIterable<any>,
    socket: Socket,
    event: string
  ) {
    let lastSent = 0;
    let accumulatedText = '';

    for await (const response of stream) {
      // Emit streaming text for real-time typing effect
      socket.emit("character_stream", { 
        text: response.text,
        isComplete: false
      });
      
      // Accumulate for final response
      accumulatedText += response.text;

      // Emit animation if present
      if (response.animation) {
        socket.emit("vrm_animation", response.animation);
      }

      // Emit cultural note if present
      if (response.culturalNote) {
        socket.emit("cultural_context", { note: response.culturalNote });
      }

      // Keep-alive for thinking animation
      const now = Date.now();
      if (now - lastSent > 2_000) {
        socket.emit("character_thinking");
        lastSent = now;
      }
    }
    
    // Send completion signal
    socket.emit("character_stream", { 
      text: '',
      isComplete: true
    });
    
    return accumulatedText;
  }
}
