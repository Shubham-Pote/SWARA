import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Zap,
  Target,
  Trophy,
  Flame,
  BookOpen,
  BarChart3,
  RotateCcw,
  Award,
} from "lucide-react"
import { lessonsAPI, profileAPI } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

// Simple Progress component
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-700 rounded-full h-2 ${className}`}>
    <div 
      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)

// Card components matching your structure
const Card = ({ className, children, ...props }: any) => (
  <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl ${className}`} {...props}>
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

const Badge = ({ className, children, ...props }: any) => (
  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`} {...props}>
    {children}
  </div>
)

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAchievements, setShowAchievements] = useState(false)
  const [profileData, setProfileData] = useState<any>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.currentLanguage) {
      fetchDashboard()
    }
  }, [user?.currentLanguage])

  // Listen for lesson completion events to refresh dashboard
  useEffect(() => {
    const handleLessonCompleted = (event: any) => {
      console.log("📊 Lesson completed, refreshing dashboard...", event.detail)
      fetchDashboard()
    }

    window.addEventListener("lessonCompleted", handleLessonCompleted)

    return () => {
      window.removeEventListener("lessonCompleted", handleLessonCompleted)
    }
  }, [])

  const fetchDashboard = async () => {
    if (!user?.currentLanguage) return

    setLoading(true)
    try {
      const response = await lessonsAPI.getDashboard(user.currentLanguage)
      console.log("📊 Dashboard API Response:", response)
      setDashboardData(response.dashboard)
      
      // Also fetch profile data for achievements
      const profileResponse = await profileAPI.getProfile()
      if (profileResponse.success) {
        setProfileData(profileResponse)
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleView = () => {
    setIsFlipping(true)
    setTimeout(() => {
      setShowAchievements(!showAchievements)
      setIsFlipping(false)
    }, 150)
  }

  const getAchievementIcon = (iconName: string) => {
    const icons: any = {
      Star,
      Flame,
      BookOpen,
      Award,
      Clock,
      Trophy,
    }
    const IconComponent = icons[iconName] || Trophy
    return <IconComponent className="w-5 h-5" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading your progress...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-300 text-lg mb-4">No dashboard data available</p>
          <Button onClick={fetchDashboard} className="bg-purple-600 hover:bg-purple-700 text-white">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Calculate progress values
  const xpProgress =
    dashboardData?.xpProgress !== undefined
      ? Math.min(100, (dashboardData.xpProgress / 100) * 100)
      : 0

  const completionRate =
    dashboardData?.completedLessons && dashboardData?.totalLessons
      ? Math.min(100, (dashboardData.completedLessons / dashboardData.totalLessons) * 100)
      : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 h-screen flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-2">
              Welcome back, {user?.displayName || user?.username || "User"}! 
            </h1>
            <p className="text-gray-300 text-sm">
              Continue your {dashboardData.language || user?.currentLanguage} learning journey
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30">
              <Trophy className="w-4 h-4" />
              Level {dashboardData.level || 1}
            </Badge>
            <Badge className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 border border-red-500/30">
              <Flame className="w-4 h-4" />
              {dashboardData.currentStreak || 0} Day Streak
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* XP Progress */}
          <Card className="h-[140px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-300">Experience Points</CardTitle>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{dashboardData.totalXP || 0}</span>
                <span className="text-sm text-blue-300">/ {dashboardData.xpForNextLevel || 100}</span>
              </div>
              <Progress value={xpProgress} className="h-2" />
              <p className="text-xs text-blue-300">{dashboardData.xpNeededForNext || 0} XP to next level</p>
            </CardContent>
          </Card>

          {/* Completion Rate */}
          <Card className="h-[140px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-emerald-300">Completion Rate</CardTitle>
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{Math.round(completionRate)}%</span>
                <span className="text-sm text-emerald-300">
                  {dashboardData.completedLessons || 0}/{dashboardData.totalLessons || 0}
                </span>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-emerald-300">
                {(dashboardData.totalLessons || 0) - (dashboardData.completedLessons || 0)} lessons remaining
              </p>
            </CardContent>
          </Card>

          {/* Study Time */}
          <Card className="h-[140px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-300">Study Time</CardTitle>
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <span className="text-2xl font-bold text-white">{dashboardData.timeSpent || 0}m</span>
              <p className="text-xs text-purple-300">Total time invested</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-xs text-purple-300">Goal: {dashboardData.dailyGoal || 15}m/day</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Score */}
          <Card className="h-[140px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-orange-300">Performance</CardTitle>
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <span className="text-2xl font-bold text-white">{dashboardData.averageScore || 0}%</span>
              <p className="text-xs text-orange-300">Average lesson score</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-300">Keep improving!</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - Fixed Height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Recent Activity */}
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest learning sessions</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="h-full overflow-y-auto space-y-3">
                {dashboardData.recentLessons?.length > 0 ? (
                  dashboardData.recentLessons.map((lesson: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-600 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{lesson.title || "Lesson"}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-300 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.timeSpent || 0}m
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {lesson.difficulty || "Beginner"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {lesson.completed ? (
                          <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 text-xs">
                            ✓ Done
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-600/20 text-gray-300 border border-gray-600/30 text-xs">
                            {lesson.progress || 0}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400">No recent activity. Start a lesson to see your progress!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Achievements & Stats */}
          <Card className={`h-full flex flex-col transition-all duration-300 transform ${isFlipping ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>
            <CardHeader className="flex-shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  {showAchievements ? 'Achievements' : 'Achievements & Stats'}
                </CardTitle>
                <Button
                  onClick={handleToggleView}
                  variant="ghost"
                  size="sm"
                  className="p-2 h-8 w-8 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  <RotateCcw className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isFlipping ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              <CardDescription>
                {showAchievements ? 'Your earned achievements' : 'Your learning milestones'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {showAchievements ? (
                // Achievements View
                <div className="space-y-3">
                  {profileData?.achievements && profileData.achievements.length > 0 ? (
                    profileData.achievements.slice(0, 4).map((achievement: any) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/30">
                        <div className="text-yellow-400">
                          {getAchievementIcon(achievement.icon)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm">{achievement.name}</h4>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No achievements yet</p>
                      <p className="text-xs text-gray-500 mt-1">Complete lessons to earn achievements!</p>
                    </div>
                  )}
                  {profileData?.achievements && profileData.achievements.length > 4 && (
                    <p className="text-xs text-gray-400 text-center">
                      +{profileData.achievements.length - 4} more achievements
                    </p>
                  )}
                </div>
              ) : (
                // Stats View
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                    <Trophy className="w-10 h-10 mx-auto text-yellow-400 mb-3" />
                    <h4 className="font-bold text-white text-2xl">{dashboardData.completedLessons || 0}</h4>
                    <p className="text-xs text-yellow-300 mt-1">Lessons Completed</p>
                  </div>

                  <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
                    <Star className="w-10 h-10 mx-auto text-blue-400 mb-3" />
                    <h4 className="font-bold text-white text-2xl">Level {dashboardData.level || 1}</h4>
                    <p className="text-xs text-blue-300 mt-1">Current Level</p>
                  </div>

                  <div className="text-center p-4 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl border border-red-500/30">
                    <Flame className="w-10 h-10 mx-auto text-red-400 mb-3" />
                    <h4 className="font-bold text-white text-2xl">{dashboardData.currentStreak || 0}</h4>
                    <p className="text-xs text-red-300 mt-1">Day Streak</p>
                  </div>

                  <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl border border-purple-500/30">
                    <Clock className="w-10 h-10 mx-auto text-purple-400 mb-3" />
                    <h4 className="font-bold text-white text-2xl">{dashboardData.timeSpent || 0}m</h4>
                    <p className="text-xs text-purple-300 mt-1">Time Invested</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard