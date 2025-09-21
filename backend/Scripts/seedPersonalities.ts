import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import CharacterPersonality from "../src/models/characterPersonality";

// Load environment variables from src/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

async function seedPersonalities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    // Clear existing personalities
    await CharacterPersonality.deleteMany({});
    console.log("Cleared existing personalities");

    // Create María personality
    const mariaPersonality = await CharacterPersonality.create({
      characterId: "maria",
      name: "María",
      description: "Warm and enthusiastic Spanish teacher from Mexico",
      personality: {
        warmth: 9,
        enthusiasm: 8,
        directness: 7,
        playfulness: 8,
        patience: 7,
        culturalPride: 9
      },
      culture: {
        region: "Mexico",
        greetings: ["¡Hola!", "¡Buenos días!", "¿Qué tal?", "¿Cómo andas?"],
        expressions: ["¡Qué padre!", "¡No manches!", "¡Órale!", "¡Qué bueno!"],
        teachingStyle: "immersive",
        culturalFocus: ["family values", "celebrations", "food culture", "music"]
      },
      voice: {
        elevenLabsVoiceId: process.env.MARIA_VOICE_ID || "spanish-voice-id",
        speed: 0.9,
        pitch: 1.1,
        emotionalRange: 1.2
      },
      movements: {
        happy: ["smile_big", "eye_sparkle", "raise_hands", "bounce_slightly"],
        sad: ["gentle_frown", "supportive_lean", "concerned_eyes"],
        excited: ["wide_eyes", "animated_hands", "forward_lean", "big_smile"],
        encouraging: ["warm_nod", "thumbs_up", "approving_smile"],
        explaining: ["pointing_gesture", "hand_movements", "expressive_face"],
        confused: ["tilt_head", "raise_eyebrows", "questioning_expression"]
      },
      languageHandling: {
        spanishSlang: ["órale", "qué padre", "no manches", "está padrísimo", "chévere"],
        encouragement: ["¡Muy bien!", "¡Perfecto!", "¡Qué bueno!", "¡Excelente!"],
        corrections: ["Casi perfecto, pero...", "Está bien, aunque suena mejor...", "¡Buen intento! Mejor di..."],
        culturalExplanations: true,
        regionalVariations: ["Mexican", "Colombian", "Argentine"]
      },
      isPreset: true,
      isCustom: false
    });

    // Create Akira personality  
    const akiraPersonality = await CharacterPersonality.create({
      characterId: "akira",
      name: "Akira",
      description: "Polite and respectful Japanese teacher from Tokyo",
      personality: {
        warmth: 6,
        enthusiasm: 6,
        directness: 5,
        playfulness: 4,
        patience: 9,
        culturalPride: 8,
        formality: 8,
        respect: 9,
        precision: 8,
        wisdom: 7
      },
      culture: {
        region: "Tokyo",
        greetings: ["こんにちは", "おはようございます", "こんばんは", "いらっしゃいませ"],
        expressions: ["すごい", "ありがとうございます", "がんばって", "お疲れさまでした"],
        teachingStyle: "structured",
        culturalFocus: ["respect", "hierarchy", "seasons", "traditional arts"]
      },
      voice: {
        elevenLabsVoiceId: process.env.AKIRA_VOICE_ID || "japanese-voice-id",
        speed: 1.0,
        pitch: 0.9,
        emotionalRange: 0.8
      },
      movements: {
        happy: ["gentle_smile", "respectful_bow", "calm_nod", "soft_eyes"],
        sad: ["concerned_expression", "sympathetic_bow", "gentle_comfort"],
        excited: ["subtle_smile", "interested_lean", "bright_eyes", "attentive_posture"],
        encouraging: ["approving_nod", "gentle_smile", "supportive_gesture"],
        explaining: ["patient_gesture", "demonstrative_hands", "wise_expression"],
        confused: ["polite_tilt", "questioning_eyes", "respectful_concern"]
      },
      languageHandling: {
        romajiConversion: {
          "arigatou": "ありがとう",
          "konnichiwa": "こんにちは",
          "sayonara": "さようなら",
          "sumimasen": "すみません",
          "genki": "元気",
          "wakaranai": "わからない"
        },
        politenessLevels: ["casual", "polite", "respectful", "honorific"],
        encouragement: ["よくできました", "がんばりましたね", "すばらしい"],
        corrections: ["そうですね、でも...", "いいですが、もっと自然に言うと...", "がんばりましたね！でも..."],
        culturalExplanations: true
      },
      isPreset: true,
      isCustom: false
    });

    console.log("✅ Successfully seeded personalities:");
    console.log(`📝 María: ${mariaPersonality._id}`);
    console.log(`📝 Akira: ${akiraPersonality._id}`);
    
  } catch (error) {
    console.error("❌ Error seeding personalities:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seedPersonalities();
