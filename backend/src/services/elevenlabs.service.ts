// Text-to-speech with timing data for VRM lip-sync integration
import axios from "axios";
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

export class ElevenLabsService {
  private base = "https://api.elevenlabs.io/v1/text-to-speech";
  private apiKey: string;

  // Character voice configurations
  private characterVoices = {
    maria: {
      voiceId: process.env.ELEVENLABS_MARIA_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel - female, warm voice
      speed: 0.9,
      pitch: 1.1,
      emotionalRange: 1.2
    },
    akira: {
      voiceId: process.env.ELEVENLABS_AKIRA_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2', // Alice - female, calm voice
      speed: 1.0,
      pitch: 0.9,
      emotionalRange: 0.8
    }
  };

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    if (!this.apiKey) {
      console.warn('⚠️ ElevenLabs API key not found. Voice synthesis will use mock audio.');
    } else {
      console.log('🔑 ElevenLabs API key configured. Testing connection...');
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async synthesize({ voiceId, text, emotion = "neutral" }: TTSOptions) {
    const tmpDir = path.join(__dirname, "../../public/audio");
    fs.mkdirSync(tmpDir, { recursive: true });

    if (!this.apiKey) {
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
      const resp = await axios.post(
        `${this.base}/${voiceId}`,
        { 
          text, 
          model_id: "eleven_multilingual_v2", 
          voice_settings: { style: emotion } 
        },
        { 
          headers: { "xi-api-key": this.apiKey }, 
          responseType: "arraybuffer" 
        }
      );

      const fileName = `speech_${Date.now()}.mp3`;
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, resp.data);

      // Enhanced viseme timeline
      const durationSec = resp.headers["content-length"] / 16_000;
      const visemes = Math.ceil(durationSec / 0.2);
      const timeline = Array.from({ length: visemes }, (_, i) => ({
        t: i * 200,
        v: ["A", "E", "I", "O", "U"][i % 5]
      }));

      return { url: `/audio/${fileName}`, timeline };
    } catch (error) {
      console.error('ElevenLabs synthesis failed:', error);
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
   */
  async generateWithLipSync(
    text: string, 
    characterId: 'maria' | 'akira',
    emotion?: string
  ): Promise<AudioResult | null> {
    console.log(`\n🎤 generateWithLipSync called for ${characterId}:`);
    console.log(`📝 Text: "${text}"`);
    console.log(`😊 Emotion: ${emotion || 'none'}`);
    console.log(`🔑 API Key configured: ${!!this.apiKey}`);

    if (!this.apiKey) {
      console.warn('⚠️ ElevenLabs not configured, returning mock data');
      return this.generateMockAudio(text, characterId);
    }

    try {
      const voiceConfig = this.characterVoices[characterId];
      console.log(`🎯 Using voice: ${voiceConfig.voiceId}`);
      
      const emotionModulation = this.getEmotionModulation(emotion, characterId);
      console.log(`🎭 Emotion modulation:`, emotionModulation);
      
      // Generate audio with timing
      console.log(`🔊 Calling generateAudio...`);
      const audioResponse = await this.generateAudio(text, voiceConfig, emotionModulation);
      
      console.log(`✅ Audio generation complete! URL: ${audioResponse.url}`);
      
      // Extract phoneme timing
      const phonemes = this.extractPhonemes(text, audioResponse.duration);
      
      // Convert phonemes to VRM visemes
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
      console.error(`❌ generateWithLipSync failed for ${characterId}:`, error.message);
      console.error(`📊 Error details:`, {
        name: error.name,
        code: error.code,
        response: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data ? 'Response data available' : 'No response data'
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
    console.log(`⚠️ Note: Using mock audio because ElevenLabs API is unavailable`);
    
    const duration = text.length * 80; // ~80ms per character
    const phonemes = this.extractPhonemes(text, duration);
    const visemes = this.phoneToVisemes(phonemes);
    
    // Create a small silent audio file
    const tmpDir = path.join(__dirname, "../../public/audio");
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileName = `mock_speech_${characterId}_${Date.now()}.mp3`;
    const filePath = path.join(tmpDir, fileName);
    
    // Create a simple beep sound instead of silence (basic MP3 with tone)
    const sampleRate = 22050;
    const duration_seconds = Math.max(text.length * 0.1, 1); // Minimum 1 second
    const samples = Math.floor(sampleRate * duration_seconds);
    
    // Generate a simple tone based on character
    const frequency = characterId === 'maria' ? 220 : 330; // Different tones for different characters
    const amplitude = 0.1; // Very quiet
    
    // Create very minimal MP3-like header + simple audio data
    const headerSize = 44;
    const audioSize = samples * 2; // 16-bit samples
    const totalSize = headerSize + audioSize;
    
    const buffer = Buffer.alloc(totalSize);
    
    // Minimal MP3 header (simplified)
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
   * Generate audio using ElevenLabs API
   */
  private async generateAudio(
    text: string, 
    voiceConfig: VoiceConfig, 
    emotionModulation: any
  ): Promise<{ buffer: Buffer; url: string; duration: number }> {
    console.log(`📡 Calling ElevenLabs API...`);
    console.log(`🎯 Voice ID: ${voiceConfig.voiceId}`);
    console.log(`🔑 API Key configured: ${!!this.apiKey}`);
    console.log(`📝 Text length: ${text.length} characters`);
    
    try {
      const response = await axios.post(
        `${this.base}/${voiceConfig.voiceId}`,
        {
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: emotionModulation.style,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer',
          timeout: 30000 // 30 second timeout
        }
      );

      console.log(`✅ ElevenLabs API success! Status: ${response.status}`);
      console.log(`📊 Audio data size: ${response.data.byteLength} bytes`);

      const audioBuffer = Buffer.from(response.data);
      
      // Save to file for serving
      const tmpDir = path.join(__dirname, "../../public/audio");
      fs.mkdirSync(tmpDir, { recursive: true });
      const fileName = `speech_${Date.now()}.mp3`;
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, audioBuffer);
      
      console.log(`💾 Audio saved to: ${fileName}`);
      
      // Calculate duration
      const estimatedDuration = text.length * 80; // ~80ms per character
      const audioUrl = `/audio/${fileName}`;

      return {
        buffer: audioBuffer,
        url: audioUrl,
        duration: estimatedDuration
      };
    } catch (error: any) {
      console.error(`❌ ElevenLabs generation failed:`, error.message);
      console.error(`📊 Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data ? Buffer.from(error.response.data).toString() : 'No response data'
      });
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Apply emotion-based voice modulation
   */
  private getEmotionModulation(emotion?: string, characterId?: string) {
    const baseStyle = characterId === 'maria' ? 0.8 : 0.4; // María more expressive
    
    switch (emotion) {
      case 'happy':
      case 'excited':
        return { style: baseStyle + 0.3, speed: 1.1 };
      case 'sad':
        return { style: baseStyle - 0.2, speed: 0.9 };
      case 'confused':
        return { style: baseStyle, speed: 0.95 };
      case 'encouraging':
        return { style: baseStyle + 0.2, speed: 1.05 };
      default:
        return { style: baseStyle, speed: 1.0 };
    }
  }

  /**
   * Extract phoneme timing (simplified)
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
   * Convert phonemes to VRM visemes with timing
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
   * Map characters to phonemes
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
   * Map phonemes to VRM visemes
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
   * Calculate viseme weight based on phoneme strength
   */
  private calculateVisemeWeight(phoneme: string): number {
    const strongPhonemes = ['AH', 'OH', 'UH'];
    const mediumPhonemes = ['EH', 'IH', 'M', 'P', 'B'];
    
    if (strongPhonemes.includes(phoneme)) return 1.0;
    if (mediumPhonemes.includes(phoneme)) return 0.8;
    return 0.6;
  }
}
