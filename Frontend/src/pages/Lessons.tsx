import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Meteors } from "@/components/ui/meteors"
import {
  BookOpen,
  Clock,
  Play,
  Lock,
  CheckCircle,
  Users,
  MessageCircle,
  Brain,
  Zap,
  Trophy,
  ArrowRight,
  Target,
  Award,
  Flame,
  ArrowLeft,
} from "lucide-react"
import { lessonsAPI } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

interface Lesson {
  _id?: string
  id?: string
  uniqueKey: string
  sequenceNumber: number
  title: string
  completed: boolean
  locked: boolean
  progress: number
  difficulty: string
  estimatedMinutes: number
  xpReward: number
  description?: string
  culturalNotes?: string
  steps?: Array<{
    type: string
    content?: {
      audio?: boolean
    }
  }>
}

type ViewMode = 'level-selection' | 'lessons'
type SelectedLevel = 'Beginner' | 'Intermediate' | 'Advanced' | null

const Lessons = () => {
  const [loading, setLoading] = useState(true)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('level-selection')
  const [selectedLevel, setSelectedLevel] = useState<SelectedLevel>(null)
  const { user } = useAuth()

  const handleLevelSelect = (level: SelectedLevel) => {
    setSelectedLevel(level)
    setViewMode('lessons')
  }

  const handleBackToLevelSelection = () => {
    setViewMode('level-selection')
    setSelectedLevel(null)
  }

  const getUniqueStepTypes = (lesson: Lesson): string[] => {
    if (!lesson.steps) return []
    const uniqueTypes = [...new Set(lesson.steps.map((step) => step.type))]
    return uniqueTypes
  }



  const getDifficultyBadgeColor = (difficulty: string): string => {
    switch (difficulty) {
      case "Beginner":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      case "Intermediate":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30"
      case "Advanced":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30"
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case "vocabulary":
        return <BookOpen className="w-4 h-4" />
      case "phrase":
        return <MessageCircle className="w-4 h-4" />
      case "dialogue":
        return <Users className="w-4 h-4" />
      case "practice":
        return <Brain className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  // Filter lessons by selected level
  const filteredLessons = selectedLevel 
    ? lessons.filter(lesson => lesson.difficulty === selectedLevel)
    : lessons

  // Calculate level-specific progress for the level cards
  const getLevelProgress = (difficulty: string) => {
    const levelLessons = lessons.filter(l => l.difficulty === difficulty)
    const levelCompleted = levelLessons.filter(l => l.completed).length
    return levelLessons.length > 0 ? Math.round((levelCompleted / levelLessons.length) * 100) : 0
  }

  useEffect(() => {
    const fetchLessons = async () => {
      if (!user?.currentLanguage) return

      try {
        const response = await lessonsAPI.getLessonsByLanguage(user.currentLanguage)
        const lessonsWithKeys = (response.lessons || []).map((lesson: any, index: number) => ({
          ...lesson,
          uniqueKey: `${lesson._id || lesson.id || index}-${index}`,
          sequenceNumber: index + 1,
        }))
        setLessons(lessonsWithKeys)
      } catch (error) {
        console.error("Failed to fetch lessons:", error)
        setLessons([])
      } finally {
        setLoading(false)
      }
    }

    fetchLessons()
  }, [user?.currentLanguage])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading your learning journey...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 h-screen flex flex-col">
        {/* Header - Only show on level selection */}
        {viewMode === 'level-selection' && (
          <div className="flex-shrink-0 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                Lessons
              </h1>
              <p className="text-gray-300 mt-2 text-lg">
                Select your level to start learning {user?.currentLanguage === 'japanese' ? 'Japanese' : 'Spanish'}
              </p>
            </div>
          </div>
        )}

        {/* Level Selection View */}
        {viewMode === 'level-selection' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {/* Beginner Card */}
              <div 
                onClick={() => handleLevelSelect('Beginner')}
                className="group cursor-pointer h-[450px]"
              >
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 border-emerald-500/30 hover:border-emerald-400/50 p-8 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 backdrop-blur-sm h-full flex flex-col">
                  <Meteors number={10} />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Beginner</h3>
                        <p className="text-emerald-300">Build your foundation</p>
                      </div>
                    </div>
                    
                    <p className="text-slate-300 mb-6 leading-relaxed flex-1">
                      Learn greetings, basic vocabulary, and essential grammar to start your language journey.
                    </p>

                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                        <span>Progress</span>
                        <span>[You have completed {getLevelProgress('Beginner')}%]</span>
                      </div>
                      <Progress value={getLevelProgress('Beginner')} className="h-2 bg-slate-700/50" />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3">
                      VIEW LESSONS
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Intermediate Card */}
              <div 
                onClick={() => handleLevelSelect('Intermediate')}
                className="group cursor-pointer h-[450px]"
              >
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-2 border-amber-500/30 hover:border-amber-400/50 p-8 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 backdrop-blur-sm h-full flex flex-col">
                  <Meteors number={10} />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Intermediate</h3>
                        <p className="text-amber-300">Speak with confidence</p>
                      </div>
                    </div>
                    
                    <p className="text-slate-300 mb-6 leading-relaxed flex-1">
                      Handle everyday conversations with ease and understand nuanced expressions.
                    </p>

                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                        <span>Progress</span>
                        <span>[You have completed {getLevelProgress('Intermediate')}%]</span>
                      </div>
                      <Progress value={getLevelProgress('Intermediate')} className="h-2 bg-slate-700/50" />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3">
                      VIEW LESSONS
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Advanced Card */}
              <div 
                onClick={() => handleLevelSelect('Advanced')}
                className="group cursor-pointer h-[450px]"
              >
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/5 border-2 border-red-500/30 hover:border-red-400/50 p-8 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 backdrop-blur-sm h-full flex flex-col">
                  <Meteors number={10} />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Advanced</h3>
                        <p className="text-red-300">Achieve true fluency</p>
                      </div>
                    </div>
                    
                    <p className="text-slate-300 mb-6 leading-relaxed flex-1">
                      Discuss complex topics and understand nuanced cultural expressions.
                    </p>

                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                        <span>Progress</span>
                        <span>[You have completed {getLevelProgress('Advanced')}%]</span>
                      </div>
                      <Progress value={getLevelProgress('Advanced')} className="h-2 bg-slate-700/50" />
                    </div>

                    <Button className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3">
                      VIEW LESSONS
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lessons View */}
        {viewMode === 'lessons' && selectedLevel && (
          <div className="space-y-8">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                onClick={handleBackToLevelSelection}
                variant="outline"
                className="bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                BACK
              </Button>
              
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white">
                  {selectedLevel.toUpperCase()} {user?.currentLanguage === "japanese" ? "JAPANESE" : "SPANISH"}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-gray-400">Overall Progress: {getLevelProgress(selectedLevel)}%</span>
                  <div className="flex-1 max-w-xs">
                    <Progress value={getLevelProgress(selectedLevel)} className="h-2 bg-gray-700/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{getLevelProgress(selectedLevel)}%</p>
                    <p className="text-emerald-300 text-sm">Level Progress</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{filteredLessons.filter(l => l.completed).length}</p>
                    <p className="text-blue-300 text-sm">Completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{filteredLessons.filter(l => l.progress > 0 && !l.completed).length}</p>
                    <p className="text-amber-300 text-sm">In Progress</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {filteredLessons.reduce((acc, lesson) => acc + (lesson.completed ? lesson.xpReward || 50 : 0), 0)}
                    </p>
                    <p className="text-purple-300 text-sm">Total XP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lessons Grid */}
            {filteredLessons.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-32 h-32 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/25">
                  <BookOpen className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">No Lessons Available</h3>
                <p className="text-slate-300 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                  There are no {selectedLevel.toLowerCase()} lessons available for {user?.currentLanguage === "japanese" ? "Japanese" : "Spanish"} yet.
                </p>
                <Button
                  onClick={handleBackToLevelSelection}
                  className={`text-white px-8 py-4 text-lg shadow-lg ${
                    selectedLevel === 'Beginner'
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                      : selectedLevel === 'Intermediate'
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                  }`}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Level Selection
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredLessons.map((lesson: Lesson) => {
                  const uniqueStepTypes = getUniqueStepTypes(lesson)

                  return (
                    <div key={lesson.uniqueKey} className="group">
                      <div
                        className={`relative rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm border-2 ${
                          lesson.completed
                            ? selectedLevel === 'Beginner' 
                              ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400/50 shadow-lg shadow-emerald-500/10"
                              : selectedLevel === 'Intermediate'
                                ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 hover:border-amber-400/50 shadow-lg shadow-amber-500/10"
                                : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-400/50 shadow-lg shadow-red-500/10"
                            : lesson.progress > 0
                              ? selectedLevel === 'Beginner'
                                ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400/50 shadow-lg shadow-emerald-500/10"
                                : selectedLevel === 'Intermediate'
                                  ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 hover:border-amber-400/50 shadow-lg shadow-amber-500/10"
                                  : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-400/50 shadow-lg shadow-red-500/10"
                              : lesson.locked
                                ? "bg-gradient-to-br from-gray-500/5 to-gray-600/5 border-gray-500/20 opacity-60"
                                : selectedLevel === 'Beginner'
                                  ? "bg-gradient-to-br from-gray-800/50 to-gray-700/30 border-gray-600/30 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
                                  : selectedLevel === 'Intermediate'
                                    ? "bg-gradient-to-br from-gray-800/50 to-gray-700/30 border-gray-600/30 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10"
                                    : "bg-gradient-to-br from-gray-800/50 to-gray-700/30 border-gray-600/30 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10"
                        } hover:scale-[1.02] hover:-translate-y-1`}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative flex-shrink-0">
                            <div
                              className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                                lesson.completed
                                  ? selectedLevel === 'Beginner'
                                    ? "border-emerald-500 bg-emerald-500/20"
                                    : selectedLevel === 'Intermediate'
                                      ? "border-amber-500 bg-amber-500/20"
                                      : "border-red-500 bg-red-500/20"
                                  : lesson.locked
                                    ? "border-gray-500 bg-gray-500/20"
                                    : selectedLevel === 'Beginner'
                                      ? "border-emerald-400 bg-emerald-400/20"
                                      : selectedLevel === 'Intermediate'
                                        ? "border-amber-400 bg-amber-400/20"
                                        : "border-red-400 bg-red-400/20"
                              }`}
                            >
                              {lesson.completed ? (
                                <CheckCircle className={`w-8 h-8 ${
                                  selectedLevel === 'Beginner' ? 'text-emerald-400' :
                                  selectedLevel === 'Intermediate' ? 'text-amber-400' : 'text-red-400'
                                }`} />
                              ) : lesson.locked ? (
                                <Lock className="w-6 h-6 text-gray-400" />
                              ) : (
                                <span className={`text-xl font-bold ${
                                  selectedLevel === 'Beginner' ? 'text-emerald-300' :
                                  selectedLevel === 'Intermediate' ? 'text-amber-300' : 'text-red-300'
                                }`}>{lesson.sequenceNumber}</span>
                              )}
                            </div>
                            {lesson.progress > 0 && !lesson.completed && (
                              <div className="absolute inset-0 rounded-full">
                                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                                  <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className={
                                      selectedLevel === 'Beginner' ? 'text-emerald-500' :
                                      selectedLevel === 'Intermediate' ? 'text-amber-500' : 'text-red-500'
                                    }
                                    strokeDasharray={`${(lesson.progress / 100) * 175.93} 175.93`}
                                  />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className={`text-xl font-bold text-white leading-tight transition-colors ${
                                selectedLevel === 'Beginner' ? 'group-hover:text-emerald-300' :
                                selectedLevel === 'Intermediate' ? 'group-hover:text-amber-300' : 'group-hover:text-red-300'
                              }`}>
                                {lesson.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                              <Badge className={getDifficultyBadgeColor(lesson.difficulty)}>
                                {lesson.difficulty}
                              </Badge>
                              {lesson.completed && (
                                <Badge className={
                                  selectedLevel === 'Beginner' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                  selectedLevel === 'Intermediate' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                  "bg-red-500/20 text-red-300 border-red-500/30"
                                }>
                                  ✅ Mastered
                                </Badge>
                              )}
                              {lesson.progress > 0 && !lesson.completed && (
                                <Badge className={
                                  selectedLevel === 'Beginner' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                  selectedLevel === 'Intermediate' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                                  "bg-red-500/20 text-red-300 border-red-500/30"
                                }>
                                  {lesson.progress}% Complete
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{lesson.estimatedMinutes} min</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span>{lesson.xpReward || 50} XP</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {uniqueStepTypes.slice(0, 4).map((type: string) => (
                                <div
                                  key={type}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-700/50 rounded-full border border-gray-600/50 text-xs text-gray-300"
                                >
                                  {getStepIcon(type)}
                                  <span className="capitalize">{type}</span>
                                </div>
                              ))}
                              {uniqueStepTypes.length > 4 && (
                                <div className="px-3 py-1 bg-gray-700/50 rounded-full border border-gray-600/50 text-xs text-gray-300">
                                  +{uniqueStepTypes.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {lesson.progress > 0 && !lesson.completed && (
                          <div className="mb-4">
                            <Progress value={lesson.progress} className="h-2 bg-gray-700/50" />
                          </div>
                        )}

                        <div className="flex justify-end">
                          {lesson.locked ? (
                            <Button disabled className="bg-gray-600/30 text-gray-500 cursor-not-allowed">
                              <Lock className="w-4 h-4 mr-2" />
                              Locked
                            </Button>
                          ) : (
                            <Button
                              asChild
                              className={`font-semibold px-6 py-2 ${
                                lesson.completed
                                  ? "bg-gray-700/60 text-gray-200 border border-gray-600/50 hover:bg-gray-600/70 hover:text-white"
                                  : selectedLevel === 'Beginner'
                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg"
                                    : selectedLevel === 'Intermediate'
                                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                                      : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg"
                              }`}
                            >
                              <Link to={`/lesson/${lesson._id || lesson.id}`} className="flex items-center gap-2">
                                {lesson.completed ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Review
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4" />
                                    Start
                                  </>
                                )}
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            </Button>
                          )}
                        </div>

                        {lesson.completed && (
                          <div className={`mt-4 p-3 rounded-lg ${
                            selectedLevel === 'Beginner' 
                              ? "bg-gradient-to-r from-emerald-500/10 to-yellow-500/10 border border-emerald-500/30"
                              : selectedLevel === 'Intermediate'
                                ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30"
                                : "bg-gradient-to-r from-red-500/10 to-yellow-500/10 border border-red-500/30"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <span className={`font-semibold ${
                                  selectedLevel === 'Beginner' ? 'text-emerald-300' :
                                  selectedLevel === 'Intermediate' ? 'text-amber-300' : 'text-red-300'
                                }`}>Lesson Mastered!</span>
                              </div>
                              <span className={`font-semibold ${
                                selectedLevel === 'Beginner' ? 'text-emerald-200' :
                                selectedLevel === 'Intermediate' ? 'text-amber-200' : 'text-red-200'
                              }`}>+{lesson.xpReward || 50} XP</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Lessons