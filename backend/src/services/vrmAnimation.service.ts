// VRM blendshape control with emotion-personality integration
interface VRMAnimation {
  type: "facial" | "lipSync" | "body" | "gesture";
  commands: VRMCommand[];
  duration: number;
  characterId: string;
}

interface VRMCommand {
  blendshape?: string;
  weight: number;
  timing: number;
  easing: string;
}

interface EmotionAnimationMap {
  [emotion: string]: {
    maria: VRMCommand[];
    akira: VRMCommand[];
  };
}

export class VrmAnimationService {
  private emotionAnimations: EmotionAnimationMap = {
    happy: {
      maria: [
        { blendshape: "Smile", weight: 0.8, timing: 0, easing: "easeOut" },
        { blendshape: "EyeSquintLeft", weight: 0.6, timing: 200, easing: "easeInOut" },
        { blendshape: "EyeSquintRight", weight: 0.6, timing: 200, easing: "easeInOut" },
        { blendshape: "CheekPuff", weight: 0.4, timing: 400, easing: "easeIn" }
      ],
      akira: [
        { blendshape: "Smile", weight: 0.5, timing: 0, easing: "easeOut" },
        { blendshape: "EyeSquintLeft", weight: 0.3, timing: 300, easing: "easeInOut" },
        { blendshape: "EyeSquintRight", weight: 0.3, timing: 300, easing: "easeInOut" }
      ]
    },
    excited: {
      maria: [
        { blendshape: "Smile", weight: 1.0, timing: 0, easing: "easeOut" },
        { blendshape: "EyeWideLeft", weight: 0.8, timing: 100, easing: "easeOut" },
        { blendshape: "EyeWideRight", weight: 0.8, timing: 100, easing: "easeOut" },
        { blendshape: "BrowUpLeft", weight: 0.7, timing: 200, easing: "easeInOut" },
        { blendshape: "BrowUpRight", weight: 0.7, timing: 200, easing: "easeInOut" }
      ],
      akira: [
        { blendshape: "Smile", weight: 0.7, timing: 0, easing: "easeOut" },
        { blendshape: "EyeWideLeft", weight: 0.5, timing: 200, easing: "easeOut" },
        { blendshape: "EyeWideRight", weight: 0.5, timing: 200, easing: "easeOut" },
        { blendshape: "BrowUpLeft", weight: 0.4, timing: 400, easing: "easeInOut" },
        { blendshape: "BrowUpRight", weight: 0.4, timing: 400, easing: "easeInOut" }
      ]
    },
    confused: {
      maria: [
        { blendshape: "BrowDownLeft", weight: 0.6, timing: 0, easing: "easeOut" },
        { blendshape: "BrowDownRight", weight: 0.6, timing: 0, easing: "easeOut" },
        { blendshape: "MouthFunnel", weight: 0.4, timing: 300, easing: "easeInOut" }
      ],
      akira: [
        { blendshape: "BrowDownLeft", weight: 0.4, timing: 0, easing: "easeOut" },
        { blendshape: "BrowDownRight", weight: 0.4, timing: 0, easing: "easeOut" },
        { blendshape: "EyeSquintLeft", weight: 0.3, timing: 200, easing: "easeInOut" },
        { blendshape: "EyeSquintRight", weight: 0.3, timing: 200, easing: "easeInOut" }
      ]
    },
    sad: {
      maria: [
        { blendshape: "Frown", weight: 0.7, timing: 0, easing: "easeOut" },
        { blendshape: "BrowDownLeft", weight: 0.5, timing: 200, easing: "easeInOut" },
        { blendshape: "BrowDownRight", weight: 0.5, timing: 200, easing: "easeInOut" }
      ],
      akira: [
        { blendshape: "Frown", weight: 0.4, timing: 0, easing: "easeOut" },
        { blendshape: "BrowDownLeft", weight: 0.3, timing: 300, easing: "easeInOut" },
        { blendshape: "BrowDownRight", weight: 0.3, timing: 300, easing: "easeInOut" }
      ]
    },
    neutral: {
      maria: [
        { blendshape: "Smile", weight: 0.2, timing: 0, easing: "easeInOut" }
      ],
      akira: [
        { blendshape: "Smile", weight: 0.1, timing: 0, easing: "easeInOut" }
      ]
    }
  };

  /**
   * Generate emotion-based animation for specific character
   */
  generateEmotionalAnimation(
    emotion: string, 
    characterId: 'maria' | 'akira', 
    intensity: number,
    personalityMovements?: any
  ): VRMAnimation {
    const baseAnimation = this.emotionAnimations[emotion] || this.emotionAnimations.neutral;
    const characterCommands = baseAnimation[characterId] || baseAnimation.maria;

    // Apply intensity scaling
    const scaledCommands = characterCommands.map(cmd => ({
      ...cmd,
      weight: cmd.weight * Math.min(intensity * 1.2, 1.0) // Cap at 1.0
    }));

    return {
      type: "facial",
      commands: scaledCommands,
      duration: 2000,
      characterId
    };
  }

  /**
   * Generate lip-sync visemes for speech
   */
  generateLipSyncAnimation(phonemes: string[], timings: number[]): VRMAnimation {
    const commands: VRMCommand[] = [];
    
    phonemes.forEach((phoneme, index) => {
      const viseme = this.phoneToViseme(phoneme);
      commands.push({
        blendshape: viseme,
        weight: 0.8,
        timing: timings[index] || index * 100,
        easing: "linear"
      });
    });

    return {
      type: "lipSync",
      commands,
      duration: timings[timings.length - 1] || phonemes.length * 100,
      characterId: "both"
    };
  }

  /**
   * Generate gesture animation based on character personality
   */
  generateGestureAnimation(
    gestureType: string, 
    characterId: 'maria' | 'akira'
  ): VRMAnimation {
    const gestures = {
      maria: {
        wave: [
          { blendshape: "ArmRaise", weight: 1.0, timing: 0, easing: "easeOut" },
          { blendshape: "HandWave", weight: 1.0, timing: 300, easing: "easeInOut" }
        ],
        point: [
          { blendshape: "ArmPointRight", weight: 1.0, timing: 0, easing: "easeOut" },
          { blendshape: "FingerPoint", weight: 1.0, timing: 200, easing: "easeInOut" }
        ]
      },
      akira: {
        bow: [
          { blendshape: "HeadBow", weight: 0.8, timing: 0, easing: "easeInOut" },
          { blendshape: "TorsoBow", weight: 0.6, timing: 100, easing: "easeInOut" }
        ],
        gesture: [
          { blendshape: "HandGesture", weight: 0.7, timing: 0, easing: "easeOut" }
        ]
      }
    };

    const characterGestures = gestures[characterId];
    const gestureCommands = characterGestures[gestureType as keyof typeof characterGestures] || [];

    return {
      type: "gesture",
      commands: gestureCommands,
      duration: 1500,
      characterId
    };
  }

  /**
   * Map phonemes to VRM visemes
   */
  private phoneToViseme(phoneme: string): string {
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
      'TH': 'MouthPress',
      'S': 'MouthSmile',
      'Z': 'MouthSmile',
      'T': 'MouthPress',
      'D': 'MouthPress',
      'K': 'MouthOpen',
      'G': 'MouthOpen',
      'N': 'MouthPress',
      'L': 'MouthSmile',
      'R': 'MouthFunnel'
    };

    return visemeMap[phoneme.toUpperCase()] || 'MouthClosed';
  }

  // Legacy methods for backward compatibility
  buildExpressionCommand(blendshape: string) {
    return {
      type: "facial",
      blendshape,
      duration: 1_000,
      easing: "easeInOut"
    };
  }

  buildVisemeCommand(viseme: string) {
    return {
      type: "lipSync",
      viseme,
      weight: 1.0
    };
  }

  buildGestureCommand(gesture: string) {
    return {
      type: "body",
      gesture,
      duration: 1_500
    };
  }
}
