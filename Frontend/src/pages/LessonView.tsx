import { useParams, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Volume2,
  CheckCircle,
  ArrowRight,
  Star,
  BookOpen,
  MessageCircle,
  Users,
  Brain,
  Lightbulb,
  Trophy,
  Clock,
  XCircle,
  Zap,
  Target,
} from "lucide-react"
import { useState, useEffect } from "react"
import { lessonsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

// ✅ Enhanced Audio Player Class
class LessonAudioPlayer {
  private synthesis: SpeechSynthesis
  private currentAudio: HTMLAudioElement | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isPlaying = false

  constructor() {
    this.synthesis = window.speechSynthesis
  }

  async playAudio(audioPath: string | undefined, text: string, language = "japanese"): Promise<void> {
    try {
      this.stop()
      console.log(`🔊 Playing audio: ${audioPath || text}`)

      if (audioPath?.startsWith("tts:")) {
        const [, encodedText, lang] = audioPath.split(":")
        const textToSpeak = decodeURIComponent(encodedText)
        await this.speakText(textToSpeak, lang)
        return
      }

      if (audioPath?.startsWith("/audio/")) {
        try {
          await this.playAudioFile(audioPath)
          return
        } catch (audioError) {
          console.warn("🔄 Audio file failed, falling back to TTS:", audioError)
        }
      }

      if (text) {
        await this.speakText(text, language)
      }
    } catch (error) {
      console.error("❌ Audio playback error:", error)
      throw error
    }
  }

  private async playAudioFile(audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(audioPath)

      this.currentAudio.addEventListener("ended", () => {
        this.isPlaying = false
        this.currentAudio = null
        resolve()
      })

      this.currentAudio.addEventListener("error", (e) => {
        console.error("❌ Audio file error:", e)
        this.isPlaying = false
        this.currentAudio = null
        reject(new Error("Audio file could not be loaded"))
      })

      this.currentAudio
        .play()
        .then(() => {
          this.isPlaying = true
        })
        .catch(reject)
    })
  }

  private async speakText(text: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error("Speech synthesis not supported"))
        return
      }

      this.synthesis.cancel()
      this.currentUtterance = new SpeechSynthesisUtterance(text)

      const voices = this.synthesis.getVoices()
      let targetLang = "en-US"

      if (language === "japanese") {
        targetLang = "ja-JP"
      } else if (language === "spanish") {
        targetLang = "es-ES"
      }

      const voice = voices.find((v) => v.lang.startsWith(targetLang.split("-")[0]))
      if (voice) {
        this.currentUtterance.voice = voice
      }

      this.currentUtterance.rate = 0.8
      this.currentUtterance.pitch = 1.0
      this.currentUtterance.volume = 1.0

      this.currentUtterance.onstart = () => {
        this.isPlaying = true
        console.log(`🗣️ Speaking: "${text}"`)
      }

      this.currentUtterance.onend = () => {
        this.isPlaying = false
        this.currentUtterance = null
        resolve()
      }

      this.currentUtterance.onerror = (event) => {
        this.isPlaying = false
        this.currentUtterance = null
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      this.synthesis.speak(this.currentUtterance)
    })
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    if (this.synthesis) {
      this.synthesis.cancel()
    }

    this.isPlaying = false
    this.currentUtterance = null
  }

  getPlayingState(): boolean {
    return this.isPlaying
  }
}

const audioPlayer = new LessonAudioPlayer()

const LessonView = () => {
  const { id } = useParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lesson, setLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeSpent, setTimeSpent] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const [isFirstTimeCompletion, setIsFirstTimeCompletion] = useState(false)
  const [audioStates, setAudioStates] = useState<{ [key: string]: boolean }>({})

  // Add state to track if current step exercises are completed
  const [currentStepCompleted, setCurrentStepCompleted] = useState(false)
  const [answeredExercises, setAnsweredExercises] = useState<Set<string>>(new Set())

  const { toast } = useToast()
  const { user } = useAuth()

  const setAudioState = (key: string, isPlayingState: boolean) => {
    setAudioStates((prev) => ({
      ...prev,
      [key]: isPlayingState,
    }))
  }

  const playAudio = async (audioPath: string | undefined, text: string, buttonKey?: string) => {
    try {
      if (buttonKey) setAudioState(buttonKey, true)
      setIsPlaying(true)

      await audioPlayer.playAudio(audioPath, text, lesson?.language || user?.currentLanguage || "japanese")

      toast({
        title: "🔊 Audio Playing",
        description: `Playing: "${text}"`,
      })
    } catch (error) {
      console.error("Audio playback failed:", error)
      toast({
        title: "⚠️ Audio Unavailable",
        description: "Could not play audio for this content",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setIsPlaying(false)
        if (buttonKey) setAudioState(buttonKey, false)
      }, 2000)
    }
  }

  useEffect(() => {
    return () => {
      audioPlayer.stop()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!showCompletionScreen) {
        setTimeSpent((prev) => prev + 1)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [showCompletionScreen])

  useEffect(() => {
    if (id) {
      fetchLesson()
    }
  }, [id])

  // Reset step states when moving between steps
  useEffect(() => {
    setSelectedAnswer(null)
    setShowResult(false)
    setCurrentStepCompleted(false)
    setAnsweredExercises(new Set())
  }, [currentStep])

  const fetchLesson = async () => {
    if (!id) return

    setLoading(true)
    try {
      const response = await lessonsAPI.getLessonDetails(id)
      setLesson(response.lesson)
      setCurrentStep(response.lesson.currentProgress || 0)
    } catch (error) {
      console.error("Failed to fetch lesson:", error)
      toast({
        title: "Error",
        description: "Failed to fetch lesson details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateProgress = async () => {
    if (!lesson || !id) return

    try {
      const isCompleted = currentStep >= lesson.totalSteps - 1
      const wasAlreadyCompleted = lesson.completed

      await lessonsAPI.updateProgress(id, {
        currentStep: currentStep,
        totalSteps: lesson.totalSteps,
        completed: isCompleted,
        timeSpent: Math.max(timeSpent, 1),
        language: user?.currentLanguage || lesson.language,
        score: Math.round((currentStep / lesson.totalSteps) * 100),
      })

      if (isCompleted && !showCompletionScreen) {
        setIsFirstTimeCompletion(!wasAlreadyCompleted)
        setLesson((prev: any) => ({ ...prev, completed: true }))
        setShowCompletionScreen(true)

        window.dispatchEvent(
          new CustomEvent("lessonCompleted", {
            detail: { lessonId: id, language: user?.currentLanguage || lesson.language, xpEarned: lesson.xpReward || 50 },
          }),
        )

        toast({
          title: "🎉 Lesson Completed!",
          description: `Congratulations! You earned ${lesson.xpReward || 50} XP!`,
        })
      }
    } catch (error) {
      console.error("Progress update error:", error)
      toast({
        title: "Warning",
        description: "Progress couldn't be saved",
        variant: "destructive",
      })
    }
  }

  const handleNext = () => {
    const currentStepData = lesson.steps?.[currentStep]

    // For practice steps, check if all exercises are completed
    if (currentStepData?.type === "practice") {
      const hasExercises =
        currentStepData.content?.exercises &&
        Array.isArray(currentStepData.content.exercises) &&
        currentStepData.content.exercises.length > 0

      if (hasExercises && !currentStepCompleted) {
        toast({
          title: "Complete all exercises",
          description: "Please answer all questions before proceeding",
          variant: "destructive",
        })
        return
      }
    }

    if (currentStep < lesson.totalSteps - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      updateProgress()
    } else {
      updateProgress()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAnswerSelect = (answer: string, correctAnswer: string, exerciseId: string) => {
    setSelectedAnswer(answer)
    setShowResult(true)

    // Mark this exercise as answered
    setAnsweredExercises((prev) => new Set([...prev, exerciseId]))

    const isCorrect = answer === correctAnswer

    if (isCorrect) {
      toast({
        title: "Correct! ✅",
        description: "Great job! You're making progress.",
      })
    } else {
      toast({
        title: "Not quite right 🤔",
        description: "Try again or check the explanation.",
        variant: "destructive",
      })
    }

    checkIfStepCompleted(exerciseId)
  }

  const checkIfStepCompleted = (exerciseId: string) => {
    const currentStepData = lesson.steps?.[currentStep]
    const exercises = currentStepData?.content?.exercises || []

    if (exercises.length === 0) {
      setCurrentStepCompleted(true)
      return
    }

    // Check if all exercises have been answered
    const newAnsweredExercises = new Set([...answeredExercises, exerciseId])
    const allAnswered = exercises.every((exercise: any) =>
      newAnsweredExercises.has(exercise.id || `exercise-${exercises.indexOf(exercise)}`),
    )

    if (allAnswered) {
      setCurrentStepCompleted(true)
      toast({
        title: "Step Complete! 🎉",
        description: "All exercises completed. You can now proceed to the next step.",
      })
    }
  }



  // Get difficulty level for color theming
  const getDifficultyLevel = () => {
    if (lesson?.difficulty === 'Beginner') return 'beginner'
    if (lesson?.difficulty === 'Intermediate') return 'intermediate'
    if (lesson?.difficulty === 'Advanced') return 'advanced'
    return 'beginner' // default
  }

  const getThemeColors = (level: string) => {
    switch (level) {
      case 'beginner':
        return {
          primary: 'from-emerald-500 to-emerald-600',
          primaryHover: 'from-emerald-600 to-emerald-700',
          bg: 'from-emerald-500/10 to-emerald-600/5',
          border: 'border-emerald-500/30',
          text: 'text-emerald-300',
        }
      case 'intermediate':
        return {
          primary: 'from-amber-500 to-orange-500',
          primaryHover: 'from-amber-600 to-orange-600',
          bg: 'from-amber-500/10 to-amber-600/5',
          border: 'border-amber-500/30',
          text: 'text-amber-300',
        }
      case 'advanced':
        return {
          primary: 'from-red-500 to-pink-500',
          primaryHover: 'from-red-600 to-pink-600',
          bg: 'from-red-500/10 to-red-600/5',
          border: 'border-red-500/30',
          text: 'text-red-300',
        }
      default:
        return {
          primary: 'from-emerald-500 to-emerald-600',
          primaryHover: 'from-emerald-600 to-emerald-700',
          bg: 'from-emerald-500/10 to-emerald-600/5',
          border: 'border-emerald-500/30',
          text: 'text-emerald-300',
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="text-2xl font-bold text-white">Lesson Not Found</h2>
          <p className="text-gray-300 mb-6">This lesson might have been moved or deleted</p>
          <Link to="/lessons">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lessons
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const difficultyLevel = getDifficultyLevel()
  const themeColors = getThemeColors(difficultyLevel)

  if (showCompletionScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        {/* Subtle background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/lessons">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lessons
              </Button>
            </Link>
          </div>

          <div className={`bg-gradient-to-br ${themeColors.bg} backdrop-blur-sm rounded-3xl p-8 border ${themeColors.border} shadow-2xl`}>
            <div className="text-center space-y-8">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-500/25 animate-bounce">
                  <Trophy className="w-16 h-16 text-white" />
                </div>
                <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 animate-ping"></div>
              </div>

              <div>
                <h1 className="text-4xl font-bold text-white mb-4">🎉 Lesson Mastered!</h1>
                <p className="text-xl text-white/80 mb-2">Congratulations on completing</p>
                <h2 className={`text-2xl font-semibold ${themeColors.text}`}>{lesson.title}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30">
                  <Zap className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
                  <p className="text-3xl font-bold text-yellow-300 mb-2">
                    {isFirstTimeCompletion ? `+${lesson.xpReward || 50}` : "0"}
                  </p>
                  <p className="text-yellow-200/80">XP Earned</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                  <Clock className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                  <p className="text-3xl font-bold text-blue-300 mb-2">{timeSpent}m</p>
                  <p className="text-blue-200/80">Time Spent</p>
                </div>

                <div className={`bg-gradient-to-br ${themeColors.bg} backdrop-blur-sm rounded-2xl p-6 border ${themeColors.border}`}>
                  <Target className="w-12 h-12 mx-auto mb-4" style={{ color: themeColors.text.replace('text-', '') }} />
                  <p className={`text-3xl font-bold mb-2 ${themeColors.text}`}>100%</p>
                  <p className={`${themeColors.text}/80`}>Complete</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(0)
                    setShowCompletionScreen(false)
                    setSelectedAnswer(null)
                    setShowResult(false)
                  }}
                  className="flex-1 bg-gray-700/60 border-gray-600/50 text-gray-200 hover:bg-gray-600/70 hover:text-white"
                >
                  Review Lesson
                </Button>

                <Link to="/lessons" className="flex-1">
                  <Button className={`w-full bg-gradient-to-r ${themeColors.primary} hover:${themeColors.primaryHover} text-white shadow-lg`}>
                    Back to Lessons
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentStepData = lesson.steps?.[currentStep]
  const progress = lesson.totalSteps > 0 ? ((currentStep + 1) / lesson.totalSteps) * 100 : 0
  const isLastStep = currentStep >= lesson.totalSteps - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-gray-700/50 bg-gray-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <Link to="/lessons">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lessons
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
          
          {/* Left Sidebar - Steps Navigation */}
          <div className="col-span-3">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 h-full">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Lesson Steps</h3>
                  <div className="space-y-3">
                    {lesson.steps?.map((step: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                          index === currentStep
                            ? `bg-gradient-to-r ${themeColors.bg} ${themeColors.border} border-2`
                            : index < currentStep
                              ? "bg-green-500/20 border border-green-500/30 text-green-300"
                              : "bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === currentStep
                              ? `${themeColors.text}`
                              : index < currentStep
                                ? "text-green-400"
                                : "text-gray-400"
                          }`}>
                            {index < currentStep ? <CheckCircle className="w-5 h-5" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{step.title || `Step ${index + 1}`}</p>
                            <p className="text-xs opacity-75 capitalize">{step.type}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-600/50 pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-2">
                    <div
                      className={`h-2 bg-gradient-to-r ${themeColors.primary} rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-6">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 h-full">
              <div className="p-8 h-full flex flex-col">

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-white">{currentStepData?.title || `Step ${currentStep + 1}`}</h2>
                    <div className={`${themeColors.bg} ${themeColors.text} px-3 py-1 rounded-full text-sm font-medium border ${themeColors.border}`}>
                      {currentStep + 1}/{lesson.totalSteps}
                    </div>
                  </div>
                  <p className="text-gray-300">
                    {currentStepData?.type === "vocabulary" && "Learn new vocabulary with examples and pronunciation"}
                    {currentStepData?.type === "phrase" && "Master essential phrases for real conversations"}
                    {currentStepData?.type === "dialogue" && "Practice interactive conversations"}
                    {currentStepData?.type === "practice" && "Test your knowledge with exercises"}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {currentStepData ? (
                    <>
                      {currentStepData.type === "vocabulary" && currentStepData.content && (
                        <div className="space-y-6">
                          {/* Main Vocabulary Card - Wireframe Style */}
                          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/50">
                            <div className="text-center space-y-6">
                              <div>
                                <h3 className="text-4xl font-bold text-white mb-4">
                                  {currentStepData.content.word || "Comida"}
                                </h3>
                                <p className="text-xl text-gray-300 mb-4">
                                  {currentStepData.content.translation || "Food"}
                                </p>
                                {currentStepData.content.pronunciation && (
                                  <button
                                    onClick={() =>
                                      playAudio(currentStepData.content.audio, currentStepData.content.word, "vocab-pronunciation")
                                    }
                                    disabled={audioStates["vocab-pronunciation"] || isPlaying}
                                    className="bg-gray-700/50 hover:bg-gray-600/70 rounded-full px-4 py-2 inline-block transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <p className="text-gray-300">/{currentStepData.content.pronunciation || "ko'miða"}/</p>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Example Usage Box */}
                          {currentStepData.content.example && (
                            <div className="bg-gray-700/30 border border-gray-600/50 rounded-xl p-6">
                              <div className="flex items-start gap-3">
                                <MessageCircle className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
                                <div>
                                  <p className="text-emerald-400 font-medium mb-2">Example Usage:</p>
                                  <p className="text-white">{currentStepData.content.example || "Quiero pedir comida, por favor. (I want to order food, please.)"}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Learning Note */}
                          {currentStepData.content.notes && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                              <div className="flex items-start gap-3">
                                <Lightbulb className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
                                <div>
                                  <p className="text-blue-400 font-medium mb-2">Learning Note:</p>
                                  <p className="text-white/90">{currentStepData.content.notes}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {currentStepData.type === "phrase" && currentStepData.content && (
                        <div className="space-y-6">
                          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-600/50">
                            <div className="text-center space-y-6">
                              <h3 className="text-4xl font-bold text-white">
                                {currentStepData.content.phrase || "No phrase available"}
                              </h3>
                              <p className="text-xl text-gray-300">
                                {currentStepData.content.translation || "No translation"}
                              </p>
                              {currentStepData.content.pronunciation && (
                                <div className="bg-gray-700/50 rounded-full px-4 py-2 inline-block">
                                  <p className="text-gray-300">/{currentStepData.content.pronunciation}/</p>
                                </div>
                              )}
                              <Button
                                onClick={() =>
                                  playAudio(currentStepData.content.audio, currentStepData.content.phrase, "phrase-listen")
                                }
                                disabled={audioStates["phrase-listen"] || isPlaying}
                                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2"
                              >
                                {audioStates["phrase-listen"] || isPlaying ? "Playing..." : "Listen & Repeat"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStepData.type === "dialogue" && currentStepData.content?.dialogue && (
                        <div className="space-y-6">
                          <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                              <Users className="w-6 h-6 text-blue-400" />
                              Conversation Practice
                            </h3>
                          </div>

                          <div className="space-y-4">
                            {currentStepData.content.dialogue.map((line: any, index: number) => (
                              <div key={index} className={`flex ${index % 2 === 1 ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-md rounded-xl p-4 ${
                                  index % 2 === 1
                                    ? "bg-blue-600/20 border border-blue-500/30"
                                    : "bg-gray-700/50 border border-gray-600/50"
                                }`}>
                                  <div className="text-sm font-medium mb-2 opacity-75">
                                    {line.speaker || `Speaker ${index + 1}`}
                                  </div>
                                  <div className="text-base mb-2">{line.text}</div>
                                  {line.translation && (
                                    <div className="text-sm opacity-75 italic mb-2">{line.translation}</div>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => playAudio(line.audio, line.text, `dialogue-${index}`)}
                                    disabled={audioStates[`dialogue-${index}`] || isPlaying}
                                    className="text-xs bg-gray-600 hover:bg-gray-500 text-white border-0"
                                  >
                                    <Volume2 className="w-3 h-3 mr-1" />
                                    Listen
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentStepData.type === "practice" && (
                        <div className="space-y-6">
                          <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                              <Brain className="w-6 h-6 text-purple-400" />
                              Practice Exercises
                            </h3>
                          </div>

                          {currentStepData.content?.exercises &&
                          Array.isArray(currentStepData.content.exercises) &&
                          currentStepData.content.exercises.length > 0 ? (
                            <div className="space-y-6">
                              {currentStepData.content.exercises.map((exercise: any, index: number) => {
                                const exerciseId = exercise.id || `exercise-${index}`
                                const isAnswered = answeredExercises.has(exerciseId)

                                return (
                                  <div key={exerciseId} className="bg-gray-800/50 rounded-xl border border-gray-600/50 p-6">
                                    <h4 className="text-lg font-semibold text-white mb-4">{exercise.question}</h4>

                                    {/* Multiple Choice Questions */}
                                    {exercise.type === "multiple_choice" && exercise.options && (
                                      <div className="space-y-3">
                                        {exercise.options.map((option: string, optIndex: number) => {
                                          const isSelected = selectedAnswer === option
                                          const isCorrect = option === exercise.correctAnswer
                                          const showCorrect = showResult && isCorrect && isAnswered
                                          const showWrong = showResult && isSelected && !isCorrect && isAnswered

                                          return (
                                            <button
                                              key={optIndex}
                                              className={`w-full p-3 rounded-lg border transition-all text-left ${
                                                showCorrect
                                                  ? "bg-green-500/20 border-green-500/50 text-green-300"
                                                  : showWrong
                                                    ? "bg-red-500/20 border-red-500/50 text-red-300"
                                                    : isSelected
                                                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                      : "bg-gray-700/50 border-gray-600/50 text-white hover:bg-gray-600/50"
                                              }`}
                                              onClick={() =>
                                                !isAnswered &&
                                                handleAnswerSelect(option, exercise.correctAnswer, exerciseId)
                                              }
                                              disabled={isAnswered}
                                            >
                                              <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full border flex items-center justify-center text-sm font-bold">
                                                  {String.fromCharCode(65 + optIndex)}
                                                </div>
                                                <span>{option}</span>
                                                {showCorrect && <CheckCircle className="w-5 h-5 ml-auto" />}
                                                {showWrong && <XCircle className="w-5 h-5 ml-auto text-red-400" />}
                                              </div>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}

                                    {/* Fill in the Blank Questions */}
                                    {exercise.type === "fill_in_the_blank" && (
                                      <div className="space-y-4">
                                        <input
                                          type="text"
                                          value={exercise.userAnswer || ""}
                                          onChange={(e) => {
                                            exercise.userAnswer = e.target.value
                                            // Force re-render
                                            setSelectedAnswer(e.target.value)
                                          }}
                                          placeholder="Type your answer..."
                                          disabled={isAnswered}
                                          className="w-full p-3 text-base bg-gray-700/60 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:opacity-50"
                                          onKeyPress={(e) => {
                                            if (e.key === "Enter" && !isAnswered && exercise.userAnswer?.trim()) {
                                              const isCorrect = exercise.userAnswer.trim().toLowerCase() === (exercise.answer || exercise.correctAnswer)?.toLowerCase()
                                              setShowResult(true)
                                              setAnsweredExercises((prev) => new Set([...prev, exerciseId]))
                                              
                                              if (isCorrect) {
                                                toast({
                                                  title: "Perfect! ✅",
                                                  description: "You got it right!",
                                                })
                                              } else {
                                                toast({
                                                  title: "Try again 🤔",
                                                  description: `Correct answer: ${exercise.answer || exercise.correctAnswer}`,
                                                  variant: "destructive",
                                                })
                                              }
                                              
                                              checkIfStepCompleted(exerciseId)
                                            }
                                          }}
                                        />
                                        <Button
                                          onClick={() => {
                                            if (!isAnswered && exercise.userAnswer?.trim()) {
                                              const isCorrect = exercise.userAnswer.trim().toLowerCase() === (exercise.answer || exercise.correctAnswer)?.toLowerCase()
                                              setShowResult(true)
                                              setAnsweredExercises((prev) => new Set([...prev, exerciseId]))
                                              
                                              if (isCorrect) {
                                                toast({
                                                  title: "Perfect! ✅",
                                                  description: "You got it right!",
                                                })
                                              } else {
                                                toast({
                                                  title: "Try again 🤔",
                                                  description: `Correct answer: ${exercise.answer || exercise.correctAnswer}`,
                                                  variant: "destructive",
                                                })
                                              }
                                              
                                              checkIfStepCompleted(exerciseId)
                                            }
                                          }}
                                          disabled={isAnswered || !exercise.userAnswer?.trim()}
                                          className={`w-full bg-gradient-to-r ${themeColors.primary} hover:${themeColors.primaryHover} text-white py-2`}
                                        >
                                          Check Answer
                                        </Button>

                                        {/* Show result for fill-in-the-blank */}
                                        {showResult && isAnswered && (
                                          <div
                                            className={`rounded-lg p-4 border ${
                                              exercise.userAnswer?.trim().toLowerCase() === (exercise.answer || exercise.correctAnswer)?.toLowerCase()
                                                ? `${themeColors.bg} ${themeColors.border}`
                                                : "bg-red-500/10 border-red-500/30"
                                            }`}
                                          >
                                            <div className="flex items-start gap-3">
                                              {exercise.userAnswer?.trim().toLowerCase() === (exercise.answer || exercise.correctAnswer)?.toLowerCase() ? (
                                                <CheckCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${themeColors.text}`} />
                                              ) : (
                                                <XCircle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                                              )}
                                              <div>
                                                <p className="text-base font-medium mb-1 text-white">
                                                  {exercise.userAnswer?.trim().toLowerCase() === (exercise.answer || exercise.correctAnswer)?.toLowerCase()
                                                    ? "Correct! ✅"
                                                    : "Try again 🤔"}
                                                </p>
                                                {exercise.userAnswer?.trim().toLowerCase() !== (exercise.answer || exercise.correctAnswer)?.toLowerCase() && (
                                                  <p className="text-white/90 mb-2">
                                                    <strong>Correct answer:</strong> {exercise.answer || exercise.correctAnswer}
                                                  </p>
                                                )}
                                                {exercise.explanation && (
                                                  <p className="text-white/80 text-sm">{exercise.explanation}</p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {showResult && exercise.explanation && isAnswered && (
                                      <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                        <p className="text-blue-300 font-medium mb-2">Explanation:</p>
                                        <p className="text-white/90">{exercise.explanation}</p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Step Completion Indicator */}
                              {currentStepCompleted && (
                                <div className={`${themeColors.bg} backdrop-blur-sm border ${themeColors.border} rounded-xl p-6`}>
                                  <div className={`flex items-center justify-center gap-3 ${themeColors.text}`}>
                                    <CheckCircle className="w-6 h-6" />
                                    <span className="text-lg font-semibold">
                                      All exercises completed! You can now proceed to the next step.
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                              <h3 className="text-2xl font-bold text-white mb-2">Ready to Complete!</h3>
                              <p className="text-gray-300">All content mastered. Click next to finish.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-6" />
                      <h3 className="text-2xl font-bold text-white mb-4">No Content Available</h3>
                      <p className="text-gray-300">This step needs content.</p>
                    </div>
                  )}
                </div>

                {/* Navigation Footer */}
                <div className="border-t border-gray-600/50 pt-6 mt-6">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentStep === 0}
                      className="bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <Button
                      onClick={handleNext}
                      className={`bg-gradient-to-r ${themeColors.primary} hover:${themeColors.primaryHover} text-white`}
                      disabled={
                        currentStepData?.type === "practice" &&
                        !currentStepCompleted &&
                        currentStepData?.content?.exercises?.length > 0
                      }
                    >
                      {isLastStep ? (
                        <>
                          Complete Lesson
                          <Trophy className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Progress & Stats */}
          <div className="col-span-3">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 h-full">
              <div className="space-y-6">
                {/* Lesson Title & Description */}
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white mb-2">{lesson.title}</h3>
                  <p className="text-gray-400 text-sm">{lesson.description}</p>
                </div>

                {/* XP Reward */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-300 font-semibold">+{lesson.xpReward || 50} XP</span>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>Lesson Progress</span>
                    <span>Step {currentStep + 1} of {lesson.totalSteps}</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 bg-gradient-to-r ${themeColors.primary} rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-400">
                    {Math.round(progress)}% Complete
                  </div>
                </div>

                {/* Time Spent */}
                <div className="text-center">
                  <div className="bg-gray-700/50 rounded-xl p-4">
                    <Clock className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                    <p className="text-2xl font-bold text-white">{timeSpent}m</p>
                    <p className="text-gray-400 text-sm">Time Spent</p>
                  </div>
                </div>

                {/* Current Step Info */}
                <div className="border-t border-gray-600/50 pt-4">
                  <h4 className="text-white font-medium mb-2">Current Step</h4>
                  <div className={`${themeColors.bg} border ${themeColors.border} rounded-lg p-3`}>
                    <p className={`${themeColors.text} font-medium text-sm`}>
                      {currentStepData?.title || `Step ${currentStep + 1}`}
                    </p>
                    <p className="text-gray-400 text-xs capitalize mt-1">{currentStepData?.type}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cultural Insights Section - Bottom */}
        {lesson.culturalNotes && (
          <div className="mt-8">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
              <div className="flex items-start gap-4">
                <Lightbulb className="w-8 h-8 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-bold text-purple-300 mb-4">Cultural Insight</h3>
                  <p className="text-white/90 text-lg leading-relaxed">{lesson.culturalNotes}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  )
}

export default LessonView