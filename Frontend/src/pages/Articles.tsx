"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { readingAPI } from "@/lib/api"
import {
  BookOpen,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Newspaper,
  Globe,
  MessageCircle,
  Lightbulb,
  Zap,
  RefreshCw,
  Trophy,
  Loader2,
  ArrowLeft,
  Brain,
  History,
  Languages,
  Award,
  ChevronRight,
  RotateCcw,
  XCircle,
  AlertCircle
} from "lucide-react"

// Custom Progress component matching your design
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-700 rounded-full h-2 ${className}`}>
    <div 
      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)

// Card components matching your structure
const Card = ({ className, children, onClick, ...props }: any) => (
  <div 
    className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl transition-all duration-300 hover:border-gray-600 ${onClick ? 'cursor-pointer hover:bg-gray-900/70' : ''} ${className}`} 
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
)

const CardHeader = ({ className, children, ...props }: any) => (
  <div className={`p-6 pb-2 ${className}`} {...props}>
    {children}
  </div>
)

const CardContent = ({ className, children, ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
)

const CardTitle = ({ className, children, ...props }: any) => (
  <h3 className={`text-lg font-bold text-white ${className}`} {...props}>
    {children}
  </h3>
)

const CardDescription = ({ className, children, ...props }: any) => (
  <p className={`text-gray-400 text-sm ${className}`} {...props}>
    {children}
  </p>
)

interface ContentWithTranslation {
  originalText: string
  translation: string
  type: "sentence" | "paragraph"
}

interface Article {
  _id: string
  title: string
  language: "spanish" | "japanese"
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  contentType: "mini-stories" | "local-news" | "dialogue-reads" | "idioms-action" | "global-comparison"
  topic: string
  content: string
  contentWithTranslations?: ContentWithTranslation[]
  preview: string
  estimatedReadTime: number
  culturalContext: {
    country: string
    backgroundInfo: string
    culturalTips: string[]
    learningPoints: string[]
  }
  vocabulary: Array<{
    word: string
    definition: string
    pronunciation: string
    difficulty: number
    contextSentence: string
  }>
  grammarPoints: Array<{
    concept: string
    explanation: string
    examples: string[]
  }>
  comprehensionQuestions: Array<{
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }>
  interactiveElements: {
    storyChoices: Array<{
      choiceText: string
      outcome: string
      vocabularyIntroduced: string[]
    }>
  }
  isStarterArticle: boolean
  createdAt?: string
}

interface ReadingProgress {
  status: "not_started" | "reading" | "completed"
  timeSpent: number
  startedAt: Date
  completedAt?: Date
  quizScore?: number
  quizAttempts?: number
}

interface UserArticleData {
  article: Article
  progress: ReadingProgress
}

interface ReadingStats {
  totalCompleted: number
  averageScore: number
  totalTimeSpent: number
  currentStreak: number
  language: string
}

const Articles = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Main state
  const [currentArticle, setCurrentArticle] = useState<UserArticleData | null>(null)
  const [completedArticles, setCompletedArticles] = useState<UserArticleData[]>([])
  const [stats, setStats] = useState<ReadingStats | null>(null)
  const [loading, setLoading] = useState(false)
  const selectedLanguage = user?.currentLanguage || "spanish"

  // View state
  const [currentView, setCurrentView] = useState<"dashboard" | "article">("dashboard")
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null)
  const [viewingProgress, setViewingProgress] = useState<ReadingProgress | null>(null)

  // Reading session state
  const [readingStarted, setReadingStarted] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({})
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showTranslations, setShowTranslations] = useState(false)
  const [canRetakeQuiz, setCanRetakeQuiz] = useState(false)

  // Interactive elements
  const [storyChoice, setStoryChoice] = useState<number | null>(null)
  const [readingTime, setReadingTime] = useState(0)

  const contentTypes = [
    {
      value: "mini-stories",
      label: "Interactive Stories",
      icon: BookOpen,
      description: "Stories with choices and multiple endings",
    },
    { 
      value: "local-news", 
      label: "Cultural News", 
      icon: Newspaper, 
      description: "Simple news from native countries" 
    },
    {
      value: "dialogue-reads",
      label: "Real Conversations",
      icon: MessageCircle,
      description: "Natural dialogues and daily conversations",
    },
    {
      value: "idioms-action",
      label: "Idioms in Context",
      icon: Lightbulb,
      description: "Learn idioms through engaging stories",
    },
    {
      value: "global-comparison",
      label: "Cultural Bridges",
      icon: Globe,
      description: "Compare cultures and traditions",
    },
  ]

  // Get reading content function
  const handleGetReadingContent = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log("🚀 Generating new reading content...")

      // First try to get existing articles
      const userArticlesResponse = await readingAPI.getUserArticles(selectedLanguage)

      if (userArticlesResponse.success && userArticlesResponse.currentArticle) {
        // User already has an article
        setCurrentArticle(userArticlesResponse.currentArticle)
        setCompletedArticles(userArticlesResponse.completedArticles || [])

        toast({
          title: "Article Found! 📖",
          description: "You have an existing article ready to read.",
        })
        return
      }

      // No current article, generate a new one using getCurrentArticle
      console.log("📝 No existing article, generating new one...")
      const response = await readingAPI.getCurrentArticle(selectedLanguage)

      if (response.success && response.article) {
        const articleData = {
          article: response.article,
          progress: response.progress,
        }
        setCurrentArticle(articleData)
        setCompletedArticles([])

        toast({
          title: response.isStarter ? "Welcome! 🌟" : "New Article Generated! 🎯",
          description: response.isStarter
            ? "Here's your starter article to get started!"
            : "A personalized article based on your progress!",
        })
      } else {
        throw new Error("Failed to generate article - no article received")
      }
    } catch (error: any) {
      console.error("❌ Failed to get reading content:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate reading content. Please check your API configuration.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // API calls - Updated to fetch all user articles
  const fetchUserArticles = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await readingAPI.getUserArticles(selectedLanguage)

      if (response.success) {
        setCurrentArticle(response.currentArticle)
        setCompletedArticles(response.completedArticles || [])

        if (response.currentArticle?.article.isStarterArticle) {
          toast({
            title: "Welcome! 🌟",
            description: "Here's your starter article to begin your journey!",
          })
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch articles:", error)
      // Fallback to getCurrentArticle if getUserArticles fails
      try {
        const fallbackResponse = await readingAPI.getCurrentArticle(selectedLanguage)
        if (fallbackResponse.success) {
          const articleData = {
            article: fallbackResponse.article,
            progress: fallbackResponse.progress,
          }
          setCurrentArticle(articleData)
          setCompletedArticles([])

          if (fallbackResponse.isNew) {
            toast({
              title: fallbackResponse.isStarter ? "Welcome! 🌟" : "New Article Generated! 🎯",
              description: fallbackResponse.isStarter
                ? "Here's your starter article to get started!"
                : "A personalized article based on your progress!",
            })
          }
        }
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to load articles. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const viewArticleById = async (articleId: string) => {
    try {
      const response = await readingAPI.getArticleById(articleId)
      if (response.success) {
        setViewingArticle(response.article)
        setViewingProgress(response.progress)
        setCurrentView("article")
        setReadingStarted(false) // Completed articles shouldn't auto-start
        setShowQuiz(false)
        setQuizSubmitted(false)
        setSelectedAnswers({})
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load article.",
        variant: "destructive",
      })
    }
  }

  // Auto-start reading when going to current article view
  const goToCurrentArticle = () => {
    if (!currentArticle) return

    setViewingArticle(currentArticle.article)
    setViewingProgress(currentArticle.progress)
    setCurrentView("article")

    if (currentArticle.progress.status === "not_started") {
      // Auto-start reading for new articles
      setTimeout(() => {
        startReading()
      }, 500)
    } else if (currentArticle.progress.status === "reading") {
      setReadingStarted(true)
    }
  }

  const startReading = async () => {
    const article = viewingArticle || currentArticle?.article
    if (!article) return

    try {
      await readingAPI.startReading(article._id)

      setReadingStarted(true)
      if (viewingProgress) {
        setViewingProgress({ ...viewingProgress, status: "reading" })
      }
      if (currentArticle) {
        setCurrentArticle({
          ...currentArticle,
          progress: { ...currentArticle.progress, status: "reading" },
        })
      }

      toast({
        title: "Reading Started! 📖",
        description: "Take your time and enjoy learning!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start reading session.",
        variant: "destructive",
      })
    }
  }

  const completeReading = () => {
    setShowQuiz(true)
  }

  const submitQuiz = async () => {
    const article = viewingArticle || currentArticle?.article
    if (!article || quizSubmitted) return

    const answers = Object.values(selectedAnswers)
    if (answers.length !== article.comprehensionQuestions.length) {
      toast({
        title: "Please answer all questions",
        description: "Make sure to select an answer for each question.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await readingAPI.completeArticle(article._id, {
        answers,
        timeSpent: readingTime,
      })

      if (response.success) {
        const results = response.results
        setQuizSubmitted(true)
        setQuizPassed(results.passed)
        setCanRetakeQuiz(!results.passed)

        if (results.passed) {
          toast({
            title: "Great Job! 🎉",
            description: `Score: ${results.score}% - You passed! Ready for the next article.`,
          })
          // Refresh data
          fetchUserArticles()
          fetchStats()
        } else {
          toast({
            title: "Keep Practicing! 💪",
            description: `Score: ${results.score}% - You need 70% to pass. Try reading again!`,
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      })
    }
  }

  const retakeLesson = () => {
    setShowQuiz(false)
    setQuizSubmitted(false)
    setQuizPassed(false)
    setSelectedAnswers({})
    setReadingTime(0)
    setCanRetakeQuiz(false)
    setReadingStarted(true)

    toast({
      title: "Lesson Reset! 📚",
      description: "Read through the material again and retake the quiz.",
    })
  }

  const generateNextArticle = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await readingAPI.generateNextArticle(selectedLanguage)

      if (response.success) {
        await fetchUserArticles()
        setCurrentView("dashboard")
        resetReadingState()

        toast({
          title: "New Article Generated! 🎯",
          description: "Ready for your next learning adventure!",
        })
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to generate next article"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!user) return

    try {
      const response = await readingAPI.getReadingStats(selectedLanguage)
      if (response.success) {
        setStats(response.stats)
      }
    } catch (error: any) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const resetReadingState = () => {
    setViewingArticle(null)
    setViewingProgress(null)
    setReadingStarted(false)
    setShowQuiz(false)
    setQuizSubmitted(false)
    setQuizPassed(false)
    setSelectedAnswers({})
    setStoryChoice(null)
    setReadingTime(0)
    setShowTranslations(false)
    setCanRetakeQuiz(false)
  }

  const goBackToDashboard = () => {
    setCurrentView("dashboard")
    resetReadingState()
  }

  // Helper functions
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30"
      case "Intermediate":
        return "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30"
      case "Advanced":
        return "bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-400 border border-rose-500/30"
      default:
        return "bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-400 border border-gray-500/30"
    }
  }

  const getContentTypeIcon = (type: string) => {
    const typeData = contentTypes.find((ct) => ct.value === type)
    const IconComponent = typeData?.icon || BookOpen
    return <IconComponent className="w-4 h-4" />
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Enhanced text rendering with proper translations
  const renderContentWithTranslations = () => {
    const article = viewingArticle || currentArticle?.article
    if (!article) return null

    if (article.contentWithTranslations && article.contentWithTranslations.length > 0) {
      return (
        <div className="space-y-6">
          {article.contentWithTranslations.map((item, index) => (
            <div
              key={index}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-xl p-6 hover:border-gray-500 transition-all duration-300"
            >
              <div className="mb-4">
                <p className="text-lg leading-relaxed text-white font-medium">{item.originalText}</p>
              </div>

              {showTranslations && (
                <div className="border-t border-gray-600 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Languages className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">English Translation:</span>
                  </div>
                  <p className="text-gray-300 italic leading-relaxed">{item.translation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    } else {
      const sentences = article.content.split(/(?<=[.!?])\s+/)
      return (
        <div className="space-y-4">
          {sentences.map((sentence, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-xl p-6">
              <p className="text-lg leading-relaxed text-white font-medium">{sentence.trim()}</p>
              {showTranslations && (
                <div className="border-t border-gray-600 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Languages className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">English Translation:</span>
                  </div>
                  <p className="text-gray-300 italic">[Translation would appear here]</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }
  }

  // Effects
  useEffect(() => {
    if (user && selectedLanguage) {
      fetchUserArticles()
      fetchStats()
    }
  }, [user, selectedLanguage])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (readingStarted && !showQuiz) {
      interval = setInterval(() => {
        setReadingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [readingStarted, showQuiz])

  // Loading state
  if (loading && !currentArticle && completedArticles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading your reading content...</p>
        </div>
      </div>
    )
  }

  // Article View
  if (currentView === "article") {
    const article = viewingArticle || currentArticle?.article
    const progress = viewingProgress || currentArticle?.progress

    if (!article) return null

    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-6">
          {/* Enhanced Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={goBackToDashboard} 
                    className="text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>

                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(article.difficulty)}>{article.difficulty}</Badge>
                    <Badge className="bg-gray-800/50 text-gray-300 border border-gray-600">
                      {getContentTypeIcon(article.contentType)}
                      <span className="ml-1">{contentTypes.find((ct) => ct.value === article.contentType)?.label}</span>
                    </Badge>
                    {article.isStarterArticle && (
                      <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30">
                        🌟 Starter Article
                      </Badge>
                    )}
                    {progress?.status === "completed" && (
                      <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed ({progress.quizScore}%)
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Translation Toggle */}
                <Button
                  variant={showTranslations ? "default" : "outline"}
                  onClick={() => setShowTranslations(!showTranslations)}
                  className={showTranslations 
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white" 
                    : "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                  }
                >
                  <Languages className="w-4 h-4 mr-2" />
                  {showTranslations ? "Hide" : "Show"} Translations
                </Button>
              </div>

              {/* Title and Info */}
              <div>
                <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                  {getContentTypeIcon(article.contentType)}
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {article.estimatedReadTime} min read
                  </span>
                  <span>•</span>
                  <span>{article.topic}</span>
                  <span>•</span>
                  <span>{article.culturalContext.country}</span>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1">
                  <Progress
                    value={progress?.status === "completed" ? 100 : showQuiz ? 90 : readingStarted ? 50 : 10}
                    className="h-2"
                  />
                </div>
                <div className="text-sm text-gray-400">
                  {progress?.status === "completed"
                    ? "✅ Completed"
                    : showQuiz
                      ? "📝 Quiz Time"
                      : readingStarted
                        ? "📖 Reading..."
                        : "🚀 Ready"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reading Timer */}
          {readingStarted && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">Reading Time: </span>
                  <span className="text-xl font-mono text-amber-400">
                    {Math.floor(readingTime / 60)}:{(readingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cultural Context */}
          {!showQuiz && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-300 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Cultural Context - {article.culturalContext.country}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-200 mb-4">{article.culturalContext.backgroundInfo}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Cultural Tips:</h4>
                    <ul className="space-y-1">
                      {article.culturalContext.culturalTips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                          <span className="text-sm text-blue-200">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Learning Points:</h4>
                    <ul className="space-y-1">
                      {article.culturalContext.learningPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Star className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                          <span className="text-sm text-blue-200">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {!showQuiz && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Article Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderContentWithTranslations()}
              </CardContent>
            </Card>
          )}

          {/* Interactive Story Choices */}
          {!showQuiz && article.contentType === "mini-stories" && article.interactiveElements.storyChoices.length > 0 && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Choose Your Path
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {article.interactiveElements.storyChoices.map((choice, index) => (
                    <Button
                      key={index}
                      variant={storyChoice === index ? "default" : "outline"}
                      className={`w-full justify-start text-left h-auto p-4 transition-all ${
                        storyChoice === index
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                          : "border-gray-600 hover:bg-gray-800/50 text-white"
                      }`}
                      onClick={() => setStoryChoice(index)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm bg-gray-700 text-white rounded px-2 py-1">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {choice.choiceText}
                      </div>
                    </Button>
                  ))}
                </div>
                {storyChoice !== null && (
                  <div className="mt-4 p-4 bg-amber-500/20 rounded-lg border border-amber-500/30">
                    <p className="text-amber-300 font-medium mb-2">
                      {article.interactiveElements.storyChoices[storyChoice].outcome}
                    </p>
                    <div className="text-sm text-amber-200">
                      <strong>New vocabulary:</strong>{" "}
                      {article.interactiveElements.storyChoices[storyChoice].vocabularyIntroduced.join(", ")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Vocabulary Section */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-emerald-400 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Key Vocabulary ({article.vocabulary.length} words)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {article.vocabulary.map((vocab, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-emerald-300 text-lg">{vocab.word}</h4>
                      <Badge
                        className={`${
                          vocab.difficulty === 1
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : vocab.difficulty === 2
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {vocab.difficulty === 1 ? "Basic" : vocab.difficulty === 2 ? "Intermediate" : "Advanced"}
                      </Badge>
                    </div>
                    <p className="text-emerald-200 font-medium mb-1">{vocab.definition}</p>
                    <p className="text-emerald-200/80 italic text-sm mb-2">Pronunciation: {vocab.pronunciation}</p>
                    <div className="bg-emerald-500/20 rounded p-2">
                      <p className="text-emerald-200 text-sm">
                        <strong>Example:</strong> {vocab.contextSentence}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Grammar Points */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Grammar Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {article.grammarPoints.map((grammar, index) => (
                  <div key={index} className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
                    <h4 className="font-bold text-purple-300 mb-2">{grammar.concept}</h4>
                    <p className="text-purple-200 mb-3">{grammar.explanation}</p>
                    <div className="bg-purple-500/20 rounded p-3">
                      <p className="text-purple-200 text-sm">
                        <strong>Examples:</strong> {grammar.examples.join(" • ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Quiz Section */}
          {showQuiz && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Award className="w-6 h-6 text-yellow-400" />
                    Comprehension Quiz
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Pass with 70% or higher</p>
                    <p className="text-lg font-mono text-white">
                      {Object.keys(selectedAnswers).length}/{article.comprehensionQuestions.length}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {article.comprehensionQuestions.map((question, qIndex) => (
                    <div key={qIndex} className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-xl p-6">
                      <h4 className="font-semibold mb-4 text-lg text-white">
                        Question {qIndex + 1}: {question.question}
                      </h4>

                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => {
                          const isSelected = selectedAnswers[qIndex] === optIndex
                          const isCorrect = question.correctAnswer === optIndex
                          const isWrong = quizSubmitted && isSelected && !isCorrect
                          const showCorrect = quizSubmitted && isCorrect

                          return (
                            <Button
                              key={optIndex}
                              variant="outline"
                              className={`w-full justify-start h-auto p-4 text-left transition-all ${
                                isSelected && !quizSubmitted ? "border-blue-500 bg-blue-500/20 text-white" : "border-gray-600 text-white hover:text-white"
                              } ${showCorrect ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" : ""} ${
                                isWrong ? "border-rose-500 bg-rose-500/20 text-rose-300" : ""
                              }`}
                              onClick={() =>
                                !quizSubmitted && setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))
                              }
                              disabled={quizSubmitted}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono bg-gray-700 rounded px-2 py-1 text-sm text-white">
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <span>{option}</span>
                                </div>
                                {showCorrect && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                {isWrong && <XCircle className="w-5 h-5 text-rose-400" />}
                              </div>
                            </Button>
                          )
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-blue-300 mb-1">Explanation:</p>
                              <p className="text-blue-200">{question.explanation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quiz Actions */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-600">
                  <div className="text-sm text-gray-400">
                    {quizSubmitted && (
                      <span>
                        {quizPassed ? (
                          <span className="text-emerald-400 font-medium">🎉 Great job! You passed!</span>
                        ) : (
                          <span className="text-rose-400 font-medium">💪 Keep practicing! You can retake this lesson.</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {!quizSubmitted ? (
                      <Button
                        onClick={submitQuiz}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={Object.keys(selectedAnswers).length !== article.comprehensionQuestions.length}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Submit Quiz
                      </Button>
                    ) : (
                      <div className="flex gap-3">
                        {canRetakeQuiz && !quizPassed && (
                          <Button variant="outline" onClick={retakeLesson} className="border-gray-600 hover:bg-gray-800 text-white hover:text-white">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retake Lesson
                          </Button>
                        )}

                        <Button variant="outline" onClick={goBackToDashboard} className="border-gray-600 hover:bg-gray-800 text-white hover:text-white">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Dashboard
                        </Button>

                        {quizPassed && (
                          <Button 
                            onClick={generateNextArticle} 
                            disabled={loading}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Generate Next Article
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reading Actions */}
          {!showQuiz && (
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="text-gray-400">
                    {progress?.status === "completed" ? (
                      <span className="text-emerald-400 font-medium">✅ Article completed successfully!</span>
                    ) : readingStarted ? (
                      <span className="text-blue-400 font-medium">📖 Take your time reading...</span>
                    ) : (
                      <span className="text-gray-400">🚀 Reading will start automatically</span>
                    )}
                  </div>

                  {readingStarted && progress?.status !== "completed" && (
                    <Button 
                      onClick={completeReading} 
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      I'm Ready for the Quiz
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Dashboard View with Completed Articles
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-2">
            Interactive Reading
          </h1>
          <p className="text-gray-400">AI-powered reading content tailored to your learning level</p>
        </div>

        {/* Reading Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="h-[140px]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalCompleted}</p>
                    <p className="text-sm text-gray-400">Articles Completed</p>
                  </div>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-[140px]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.averageScore}%</p>
                    <p className="text-sm text-gray-400">Average Score</p>
                  </div>
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-[140px]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalTimeSpent}m</p>
                    <p className="text-sm text-gray-400">Time Spent</p>
                  </div>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="h-[140px]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
                    <p className="text-sm text-gray-400">Day Streak</p>
                  </div>
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Zap className="w-8 h-8 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current/In-Progress Article Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Current Reading</h2>

          {currentArticle ? (
            <Card
              className="border-2 border-blue-500/30 hover:border-blue-400/50"
              onClick={goToCurrentArticle}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl flex items-center gap-2 text-white">
                      {getContentTypeIcon(currentArticle.article.contentType)}
                      {currentArticle.article.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <Badge className={getDifficultyColor(currentArticle.article.difficulty)}>
                        {currentArticle.article.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-4 h-4" />
                        {currentArticle.article.estimatedReadTime} min
                      </span>
                      <Badge className="bg-gray-800/50 text-gray-300 border border-gray-600">{currentArticle.article.topic}</Badge>
                      {currentArticle.article.isStarterArticle && (
                        <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30">
                          🌟 Starter Article
                        </Badge>
                      )}
                      <Badge className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30">
                        📖 In Progress
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-gray-400 mb-4">{currentArticle.article.preview}</p>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="capitalize text-gray-300">{currentArticle.progress.status.replace("_", " ")}</span>
                  </div>
                  <Progress
                    value={
                      currentArticle.progress.status === "completed"
                        ? 100
                        : currentArticle.progress.status === "reading"
                          ? 50
                          : 0
                    }
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    {currentArticle.progress.status === "completed" && currentArticle.progress.quizScore ? (
                      <>✅ Completed (Score: {currentArticle.progress.quizScore}%)</>
                    ) : currentArticle.progress.status === "reading" ? (
                      "📖 Continue reading..."
                    ) : (
                      "🆕 Ready to start"
                    )}
                  </div>
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Go to Article
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-semibold mb-2 text-white">No active article</h3>
                <p className="text-gray-400 mb-4">Ready to start your {selectedLanguage} reading journey?</p>
                <Button 
                  onClick={handleGetReadingContent} 
                  disabled={loading} 
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Article...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Get Reading Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Completed Articles Section */}
        {completedArticles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Completed Articles ({completedArticles.length})</h2>
              <Badge className="flex items-center gap-1 bg-gray-800/50 text-gray-300 border border-gray-600">
                <Trophy className="w-3 h-3" />
                {completedArticles.length} completed
              </Badge>
            </div>

            <div className="grid gap-4">
              {completedArticles.map((articleData) => (
                <Card
                  key={articleData.article._id}
                  className="border border-green-500/30 bg-green-500/5"
                  onClick={() => viewArticleById(articleData.article._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getContentTypeIcon(articleData.article.contentType)}
                          <h3 className="font-semibold text-white">{articleData.article.title}</h3>
                          <Badge className={getDifficultyColor(articleData.article.difficulty)}>
                            {articleData.article.difficulty}
                          </Badge>
                          <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30">
                            ✅ Completed
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">{articleData.article.preview}</p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Topic: {articleData.article.topic}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-green-400 font-medium">
                            <Trophy className="w-3 h-3" />
                            Score: {articleData.progress.quizScore}%
                          </span>
                          <span>•</span>
                          <span>Time: {Math.round((articleData.progress.timeSpent || 0) / 60)}m</span>
                          {articleData.progress.completedAt && (
                            <>
                              <span>•</span>
                              <span>Completed: {formatDate(articleData.progress.completedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${
                            (articleData.progress.quizScore || 0) >= 90
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : (articleData.progress.quizScore || 0) >= 80
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }`}
                        >
                          <Trophy className="w-3 h-3 mr-1" />
                          {articleData.progress.quizScore}%
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for No Completed Articles */}
        {completedArticles.length === 0 && currentArticle && (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <h3 className="font-semibold mb-1 text-white">No completed articles yet</h3>
            <p className="text-sm text-gray-400">
              Complete your current article to start building your reading history!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Articles
