import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  MapPin,
  Settings,
  Camera,
  Flame,
  Globe,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { profileAPI } from "@/lib/api"

const Profile = () => {
  const { user: contextUser, logout, switchLanguage, updateUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [switchingLanguage, setSwitchingLanguage] = useState(false)
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    location: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (contextUser) {
      setFormData({
        displayName: contextUser.displayName || "",
        bio: contextUser.bio || "",
        location: contextUser.location || "",
      })
    }
  }, [contextUser])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const data = await profileAPI.getProfile()
      if (data.success && data.user) {
        setProfile(data)
        updateUser(data.user)
        setFormData({
          displayName: data.user.displayName || "",
          bio: data.user.bio || "",
          location: data.user.location || "",
        })
      }
    } catch (error: any) {
      console.error("Profile fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!formData.displayName.trim()) {
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        handleLogout()
        return
      }

      const result = await profileAPI.updateProfile({
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
      })

      if (result.success && result.user) {
        updateUser(result.user)
        setProfile((prevProfile: any) => ({
          ...prevProfile,
          user: result.user,
        }))
        setFormData({
          displayName: result.user.displayName || "",
          bio: result.user.bio || "",
          location: result.user.location || "",
        })
      }
    } catch (error: any) {
      console.error("Profile update error:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/auth/signin")
  }

  const handleLanguageSwitch = async (newLanguage: string) => {
    setSwitchingLanguage(true)
    try {
      await switchLanguage(newLanguage)
      if (contextUser) {
        const updatedUser = { ...contextUser, currentLanguage: newLanguage }
        updateUser(updatedUser)
      }
      if (profile) {
        setProfile((prev: any) => ({
          ...prev,
          user: { ...prev.user, currentLanguage: newLanguage },
        }))
      }
    } catch (error: any) {
      console.error("Language switch error:", error)
    } finally {
      setSwitchingLanguage(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile && !contextUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg mb-4">No profile data available</p>
          <Button onClick={fetchProfile} className="bg-purple-600 hover:bg-purple-700 text-white">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const userData = profile?.user || contextUser || {}
  const userStats = profile?.stats || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-gray-300 mt-1 text-sm">Manage your account and learning preferences</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Overview */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 h-[500px] flex flex-col">
            <div className="text-center mb-4">
              <div className="relative mx-auto w-20 h-20 mb-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                  {(userData.displayName || userData.email || "U").substring(0, 2).toUpperCase()}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 rounded-full p-1.5 bg-gray-800 border-gray-600 hover:bg-gray-700"
                >
                  <Camera className="w-3 h-3 text-gray-300" />
                </Button>
              </div>
              <h2 className="text-lg font-bold text-white">{userData.displayName || "User"}</h2>
              <p className="text-gray-400 text-sm">{userData.bio || "Language Enthusiast"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                <div className="text-xl font-bold text-yellow-400">{userStats.level || 1}</div>
                <div className="text-xs text-gray-400">Level</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                <div className="text-xl font-bold text-blue-400">{userStats.totalXP || 0}</div>
                <div className="text-xs text-gray-400">Total XP</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-lg border border-red-500/30">
                <div className="text-xl font-bold text-red-400 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5" />
                  {userStats.streak || 0}
                </div>
                <div className="text-xs text-gray-400">Day Streak</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg border border-emerald-500/30">
                <div className="text-xl font-bold text-emerald-400">{userStats.lessonsCompleted || 0}</div>
                <div className="text-xs text-gray-400">Lessons Done</div>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(userData.joinDate || Date.now()).toLocaleDateString()}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Globe className="w-4 h-4" />
                  <span>Learning Language</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={userData.currentLanguage === "japanese" ? "default" : "outline"}
                    onClick={() => handleLanguageSwitch("japanese")}
                    disabled={switchingLanguage}
                    className={`h-7 px-2 text-xs transition-all ${
                      userData.currentLanguage === "japanese"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    🇯🇵 Japanese
                  </Button>
                  <Button
                    size="sm"
                    variant={userData.currentLanguage === "spanish" ? "default" : "outline"}
                    onClick={() => handleLanguageSwitch("spanish")}
                    disabled={switchingLanguage}
                    className={`h-7 px-2 text-xs transition-all ${
                      userData.currentLanguage === "spanish"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    🇲🇽 Spanish
                  </Button>
                </div>
              </div>

              {userData.location && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{userData.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Settings */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 h-[500px] flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Profile Settings</h3>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="displayName" className="text-gray-300 text-sm">
                  Display Name
                </Label>
                <input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Enter your display name"
                  className="w-full p-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-400 focus:border-purple-500 focus:outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-gray-300 text-sm">
                  Email
                </Label>
                <input
                  id="email"
                  type="email"
                  value={userData.email || ""}
                  disabled
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="location" className="text-gray-300 text-sm">
                  Location
                </Label>
                <input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where are you from?"
                  className="w-full p-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder:text-gray-400 focus:border-purple-500 focus:outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bio" className="text-gray-300 text-sm">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your language learning journey..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="min-h-[80px] bg-gray-800/50 border border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 text-sm resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">{formData.bio.length}/500</p>
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all mt-4"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile