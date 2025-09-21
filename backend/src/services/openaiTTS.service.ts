// OpenAI Text-to-Speech service with VRM lip-sync animation support
import OpenAI from "openai";
import fs from "fs";
import path from "path";

interface TTSOptions {
  voiceId: string;
  text: string;
  emotion?: "happy" | "sad" | "excited" | "neutral";
}

interface VoiceConfig {
  voiceId: string;
  speed: number;
  pitch: number;
  emotionalRange: number;
}

interface AudioResult {
  audioBuffer: Buffer;
  audioUrl: string;
  duration: number;
  phonemes: PhonemeData[];
  visemes: VisemeData[];
  timeline: Array<{ t: number; v: string }>; // Legacy format for compatibility
}

interface PhonemeData {
  phoneme: string;
  startTime: number;
  endTime: number;
}

interface VisemeData {
  viseme: string;
  startTime: number;
  endTime: number;
  weight: number;
}

export class OpenAITTSService {
  private openai: OpenAI;

  // Character voice configurations for OpenAI TTS
  private characterVoices = {
    maria: {
      voiceId: 'nova', // Warm, expressive female voice for Spanish
      speed: 0.9,
      pitch: 1.1,
      emotionalRange: 1.2
    },
    akira: {
      voiceId: 'shimmer', // Calm, gentle female voice for Japanese
      speed: 1.0,
      pitch: 0.9,
      emotionalRange: 0.8
    }
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not found. Voice synthesis will use mock audio.');
    } else {
      console.log('🔑 OpenAI TTS configured successfully!');
    }
  }

  /**
   * Legacy method for backward compatibility with ElevenLabs interface
   */
  async synthesize({ voiceId, text, emotion = "neutral" }: TTSOptions) {
    const tmpDir = path.join(__dirname, "../../public/audio");
    fs.mkdirSync(tmpDir, { recursive: true });

    if (!process.env.OPENAI_API_KEY) {
      // Return mock data when API key is missing
      return {
        url: `/audio/mock_speech.mp3`,
        timeline: Array.from({ length: 5 }, (_, i) => ({
          t: i * 200,
          v: ["A", "E", "I", "O", "U"][i % 5]
        }))
      };
    }

    try {
      const audioResult = await this.generateAudio(text, { voiceId } as any, { style: emotion });
      
      // Generate timeline for backward compatibility
      const phonemes = this.extractPhonemes(text, audioResult.duration);
      const visemes = this.phoneToVisemes(phonemes);
      const timeline = visemes.map(v => ({
        t: v.startTime,
        v: v.viseme.replace('Mouth', '').substring(0, 1)
      }));
      
      return {
        url: audioResult.url,
        timeline: timeline
      };
    } catch (error) {
      console.error('OpenAI TTS synthesis failed:', error);
      // Return mock data on error
      return {
        url: `/audio/mock_speech.mp3`,
        timeline: Array.from({ length: 5 }, (_, i) => ({
          t: i * 200,
          v: ["A", "E", "I", "O", "U"][i % 5]
        }))
      };
    }
  }

  /**
   * Generate speech with lip-sync timing data for VRM animation
   * Main method that replaces ElevenLabs generateWithLipSync
   */
  async generateWithLipSync(
    text: string, 
    characterId: 'maria' | 'akira',
    emotion?: string
  ): Promise<AudioResult | null> {
    console.log(`\n🎤 OpenAI TTS generateWithLipSync called for ${characterId}:`);
    console.log(`📝 Text: "${text}"`);
    console.log(`😊 Emotion: ${emotion || 'none'}`);
    console.log(`🔑 API Key configured: ${!!process.env.OPENAI_API_KEY}`);

    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI not configured, returning mock data');
      return this.generateMockAudio(text, characterId);
    }

    try {
      const voiceConfig = this.characterVoices[characterId];
      console.log(`🎯 Using OpenAI voice: ${voiceConfig.voiceId}`);
      
      const emotionModulation = this.getEmotionModulation(emotion, characterId);
      console.log(`🎭 Emotion modulation:`, emotionModulation);
      
      // Generate audio with OpenAI
      console.log(`🔊 Calling OpenAI TTS API...`);
      const audioResponse = await this.generateAudio(text, voiceConfig, emotionModulation);
      
      console.log(`✅ Audio generation complete! URL: ${audioResponse.url}`);
      
      // Extract phoneme timing (same logic as ElevenLabs)
      const phonemes = this.extractPhonemes(text, audioResponse.duration);
      
      // Convert phonemes to VRM visemes (same logic as ElevenLabs)
      const visemes = this.phoneToVisemes(phonemes);

      // Legacy timeline format for compatibility
      const timeline = visemes.map(v => ({
        t: v.startTime,
        v: v.viseme.replace('Mouth', '').substring(0, 1)
      }));

      return {
        audioBuffer: audioResponse.buffer,
        audioUrl: audioResponse.url,
        duration: audioResponse.duration,
        phonemes,
        visemes,
        timeline
      };
    } catch (error: any) {
      console.error(`❌ OpenAI TTS failed for ${characterId}:`, error.message);
      console.error(`📊 Error details:`, {
        name: error.name,
        code: error.code,
        status: error.status
      });
      console.warn(`🔄 Falling back to mock audio`);
      
      return this.generateMockAudio(text, characterId);
    }
  }

  /**
   * Generate mock audio data when API is unavailable
   */
  private generateMockAudio(text: string, characterId: string): AudioResult {
    console.log(`🎭 Generating mock audio for ${characterId}: "${text}"`);
    console.log(`⚠️ Note: Using mock audio because OpenAI API is unavailable`);
    
    const duration = text.length * 80; // ~80ms per character
    const phonemes = this.extractPhonemes(text, duration);
    const visemes = this.phoneToVisemes(phonemes);
    
    // Create a small silent audio file
    const tmpDir = path.join(__dirname, "../../public/audio");
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileName = `mock_speech_${characterId}_${Date.now()}.mp3`;
    const filePath = path.join(tmpDir, fileName);
    
    // Create a simple beep sound instead of silence
    const sampleRate = 22050;
    const duration_seconds = Math.max(text.length * 0.1, 1);
    const samples = Math.floor(sampleRate * duration_seconds);
    
    // Generate a simple tone based on character
    const frequency = characterId === 'maria' ? 220 : 330; // Different tones
    const amplitude = 0.1; // Very quiet
    
    const headerSize = 44;
    const audioSize = samples * 2;
    const totalSize = headerSize + audioSize;
    
    const buffer = Buffer.alloc(totalSize);
    
    // Minimal MP3 header
    buffer.writeUInt8(0xFF, 0);
    buffer.writeUInt8(0xFB, 1);
    buffer.writeUInt8(0x90, 2);
    buffer.writeUInt8(0x00, 3);
    
    // Fill with very quiet tone data
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767;
      const offset = headerSize + i * 2;
      if (offset < buffer.length - 1) {
        buffer.writeInt16LE(Math.floor(sample), offset);
      }
    }
    
    fs.writeFileSync(filePath, buffer);
    const audioUrl = `/audio/${fileName}`;
    
    console.log(`🔇 Mock audio created: ${audioUrl} (${duration}ms, ${characterId} voice simulation)`);
    
    return {
      audioBuffer: buffer,
      audioUrl: audioUrl,
      duration,
      phonemes,
      visemes,
      timeline: visemes.map(v => ({
        t: v.startTime,
        v: v.viseme.replace('Mouth', '').substring(0, 1)
      }))
    };
  }

  /**
   * Generate audio using OpenAI TTS API
   */
  private async generateAudio(
    text: string, 
    voiceConfig: VoiceConfig, 
    emotionModulation: any
  ): Promise<{ buffer: Buffer; url: string; duration: number }> {
    console.log(`📡 Calling OpenAI TTS API...`);
    console.log(`🎯 Voice: ${voiceConfig.voiceId}`);
    console.log(`📝 Text length: ${text.length} characters`);
    
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: "tts-1", // or "tts-1-hd" for higher quality
        voice: voiceConfig.voiceId as any,
        input: text,
        speed: emotionModulation.speed || 1.0
      });

      console.log(`✅ OpenAI TTS API success!`);

      const audioBuffer = Buffer.from(await mp3.arrayBuffer());
      console.log(`📊 Audio data size: ${audioBuffer.length} bytes`);
      
      // Ensure the public/audio directory exists
      const tmpDir = path.join(__dirname, "../../public/audio");
      if (!require('fs').existsSync(tmpDir)) {
        require('fs').mkdirSync(tmpDir, { recursive: true });
        console.log(`📁 Created audio directory: ${tmpDir}`);
      }
      
      // Create unique filename with timestamp
      const fileName = `openai_speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
      const filePath = path.join(tmpDir, fileName);
      
      // Write the audio file
      require('fs').writeFileSync(filePath, audioBuffer);
      console.log(`💾 Audio saved to: ${filePath}`);
      
      // Verify file was written
      if (require('fs').existsSync(filePath)) {
        const fileSize = require('fs').statSync(filePath).size;
        console.log(`✅ File verified: ${fileName} (${fileSize} bytes)`);
      } else {
        console.error(`❌ File not found after writing: ${filePath}`);
      }
      
      // Calculate duration (estimate based on text length)
      const estimatedDuration = text.length * 80; // ~80ms per character
      const audioUrl = `/audio/${fileName}`;
      
      console.log(`🔗 Audio URL: ${audioUrl}`);

      return {
        buffer: audioBuffer,
        url: audioUrl,
        duration: estimatedDuration
      };
    } catch (error: any) {
      console.error(`❌ OpenAI TTS generation failed:`, error.message);
      console.error(`📊 Error details:`, {
        status: error.status,
        type: error.type,
        code: error.code
      });
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Apply emotion-based voice modulation
   */
  private getEmotionModulation(emotion?: string, characterId?: string) {
    const baseSpeed = characterId === 'maria' ? 0.9 : 1.0; // María speaks slightly slower
    
    switch (emotion) {
      case 'happy':
      case 'excited':
        return { speed: baseSpeed + 0.1 };
      case 'sad':
        return { speed: baseSpeed - 0.1 };
      case 'confused':
        return { speed: baseSpeed - 0.05 };
      case 'encouraging':
        return { speed: baseSpeed + 0.05 };
      default:
        return { speed: baseSpeed };
    }
  }

  /**
   * Extract phoneme timing (simplified) - SAME AS ELEVENLABS
   */
  private extractPhonemes(text: string, duration: number): PhonemeData[] {
    const words = text.split(' ');
    const phonemes: PhonemeData[] = [];
    const timePerWord = duration / words.length;
    
    words.forEach((word, wordIndex) => {
      const wordStartTime = wordIndex * timePerWord;
      const phonemeCount = Math.max(word.length, 2);
      const timePerPhoneme = timePerWord / phonemeCount;
      
      for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase();
        const phoneme = this.charToPhoneme(char);
        
        phonemes.push({
          phoneme,
          startTime: wordStartTime + (i * timePerPhoneme),
          endTime: wordStartTime + ((i + 1) * timePerPhoneme)
        });
      }
    });

    return phonemes;
  }

  /**
   * Convert phonemes to VRM visemes with timing - SAME AS ELEVENLABS
   */
  private phoneToVisemes(phonemes: PhonemeData[]): VisemeData[] {
    return phonemes.map(phoneme => {
      const viseme = this.phonemeToViseme(phoneme.phoneme);
      const weight = this.calculateVisemeWeight(phoneme.phoneme);
      
      return {
        viseme,
        startTime: phoneme.startTime,
        endTime: phoneme.endTime,
        weight
      };
    });
  }

  /**
   * Map characters to phonemes - SAME AS ELEVENLABS
   */
  private charToPhoneme(char: string): string {
    const phoneMap: { [key: string]: string } = {
      'a': 'AH', 'e': 'EH', 'i': 'IH', 'o': 'OH', 'u': 'UH',
      'm': 'M', 'p': 'P', 'b': 'B', 'f': 'F', 'v': 'V',
      't': 'T', 'd': 'D', 'k': 'K', 'g': 'G', 'n': 'N',
      'l': 'L', 'r': 'R', 's': 'S', 'z': 'Z'
    };
    
    return phoneMap[char] || 'SIL';
  }

  /**
   * Map phonemes to VRM visemes - SAME AS ELEVENLABS
   */
  private phonemeToViseme(phoneme: string): string {
    const visemeMap: { [key: string]: string } = {
      'AH': 'MouthOpen',
      'EH': 'MouthSmile',
      'IH': 'MouthSmile',
      'OH': 'MouthFunnel', 
      'UH': 'MouthFunnel',
      'M': 'MouthClosed',
      'P': 'MouthClosed',
      'B': 'MouthClosed',
      'F': 'MouthPress',
      'V': 'MouthPress',
      'T': 'MouthPress',
      'D': 'MouthPress',
      'K': 'MouthOpen',
      'G': 'MouthOpen',
      'N': 'MouthPress',
      'L': 'MouthSmile',
      'R': 'MouthFunnel',
      'S': 'MouthSmile',
      'Z': 'MouthSmile',
      'SIL': 'MouthClosed'
    };

    return visemeMap[phoneme] || 'MouthClosed';
  }

  /**
   * Calculate viseme weight based on phoneme strength - SAME AS ELEVENLABS
   */
  private calculateVisemeWeight(phoneme: string): number {
    const strongPhonemes = ['AH', 'OH', 'UH'];
    const mediumPhonemes = ['EH', 'IH', 'M', 'P', 'B'];
    
    if (strongPhonemes.includes(phoneme)) return 1.0;
    if (mediumPhonemes.includes(phoneme)) return 0.8;
    return 0.6;
  }
}