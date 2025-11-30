'use client'

import { useState, useEffect } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, LogOut, FileText, Backpack as BackpackIcon, MessageCircle, Award, Coins, Zap, BarChart3, TrendingUp, Target, Brain, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { ProfileAvatarModal } from '@/components/profile/ProfileAvatarModal'
import { useAuth } from '@/lib/auth-context'
import { levelForXp } from '@/lib/progression/leveling'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProficiencyChart from '@/components/dashboard/ProficiencyChart'
import ConceptMasteryRadar from '@/components/dashboard/ConceptMasteryRadar'
import PredictionGauge from '@/components/dashboard/PredictionGauge'

interface UserProfile {
  name: string
  username: string
  avatar: string
  bio: string
  xp: number
  coins: number
  streak: number
  posts: number
  materials: number
}

interface ProgressionState {
  level: number
  totalXp: number
  currentLevelFloor: number
  nextLevelXp: number
  progress: number
}

interface ProficiencyData {
  overall_proficiency: number
  accuracy_rate: number
  consistency_score: number
  calculated_at: string
}

interface ConceptProficiency {
  id: string
  mastery_level: number
  concept_tags: {
    tag_name: string
    category: string
  }
}

interface PredictionData {
  currentScore: number
  predictions: {
    '7days': {
      examScore: number
      improvement: number
      confidence: number
    }
    '14days': {
      examScore: number
      improvement: number
      confidence: number
    }
  }
  recommendations: Array<{
    type: string
    concept?: string
    reason: string
    action: string
  }>
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'dashboard' | 'settings'>('profile')
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'concepts' | 'predictions'>('overview')
  const [user, setUser] = useState<UserProfile>({
    name: authUser?.email?.split('@')[0] || '使用者',
    username: `@${authUser?.email?.split('@')[0] || 'user'}`,
    avatar: '',
    bio: '熱愛學習的高中生 📚',
    xp: 1240,
    coins: 580,
    streak: 7,
    posts: 23,
    materials: 45,
  })
  const [progression, setProgression] = useState<ProgressionState | null>(null)
  
  // Dashboard data
  const [proficiency, setProficiency] = useState<ProficiencyData | null>(null)
  const [concepts, setConcepts] = useState<ConceptProficiency[]>([])
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Fetch user profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        const [profileRes, progressionRes] = await Promise.all([
          fetch('/api/profile', { credentials: 'include' }).catch(() => null),
          fetch('/api/play/progression/status', { credentials: 'include' }).catch(() => null),
        ])

        const [profileData, progressionData] = await Promise.all([
          profileRes?.ok ? profileRes.json() : Promise.resolve(null),
          progressionRes?.ok ? progressionRes.json() : Promise.resolve(null),
        ])

        const xpSource = progressionData?.success && progressionData.progression?.xp
          ? progressionData.progression.xp.total ?? 0
          : profileData?.profile?.xp ?? 0
        const levelInfo = levelForXp(xpSource)

        if (progressionData?.success && progressionData.progression?.xp) {
          setProgression({
            level: progressionData.progression.xp.level,
            totalXp: levelInfo.currentXp,
            currentLevelFloor: levelInfo.currentLevelFloor,
            nextLevelXp: progressionData.progression.xp.nextLevelXp,
            progress: progressionData.progression.xp.progress,
          })
        } else {
          setProgression({
            level: levelInfo.level,
            totalXp: levelInfo.currentXp,
            currentLevelFloor: levelInfo.currentLevelFloor,
            nextLevelXp: levelInfo.nextLevelXp,
            progress: levelInfo.progressPct,
          })
        }

        if (profileData?.success && profileData.profile) {
          setUser(prev => ({
            ...prev,
            name: profileData.profile.username || prev.name,
            username: `@${profileData.profile.username || prev.username.replace('@', '')}`,
            avatar: profileData.profile.avatar_url || prev.avatar,
            xp: levelInfo.currentXp,
            coins: profileData.profile.coins ?? prev.coins,
            streak: profileData.profile.streak ?? prev.streak,
          }))
        }
      } catch (error) {
        console.error('[ProfilePage] Failed to fetch profile:', error)
      }
    }

    fetchProfile()
  }, [])

  const resolvedProgression: ProgressionState = progression || (() => {
    const info = levelForXp(user.xp)
    return {
      level: info.level,
      totalXp: info.currentXp,
      currentLevelFloor: info.currentLevelFloor,
      nextLevelXp: info.nextLevelXp,
      progress: info.progressPct,
    }
  })()

  // Fetch dashboard data when dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData()
    }
  }, [activeTab])

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true)

      // Fetch all data in parallel
      const [proficiencyRes, conceptsRes, predictionRes] = await Promise.all([
        fetch('/api/proficiency/calculate').catch(() => null),
        fetch('/api/proficiency/concepts').catch(() => null),
        fetch('/api/dashboard/prediction').catch(() => null)
      ])

      const [proficiencyData, conceptsData, predictionData] = await Promise.all([
        proficiencyRes?.json().catch(() => null) || Promise.resolve(null),
        conceptsRes?.json().catch(() => null) || Promise.resolve(null),
        predictionRes?.json().catch(() => null) || Promise.resolve(null)
      ])

      if (proficiencyData?.proficiency) {
        setProficiency(Array.isArray(proficiencyData.proficiency) ? proficiencyData.proficiency[0] : proficiencyData.proficiency)
      }

      if (conceptsData?.concepts) {
        setConcepts(conceptsData.concepts)
      }

      if (predictionData) {
        setPrediction(predictionData)
      }
    } catch (error) {
      console.error('[ProfilePage] Failed to fetch dashboard data:', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleAvatarUpdate = (avatarUrl: string) => {
    setUser(prev => ({ ...prev, avatar: avatarUrl }))
  }

  return (
    <>
      <AppBar title="Profile" user={{ name: user.name, avatar: user.avatar }} />

      <main className="mx-auto max-w-lg p-4 pb-20">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile">個人資料</TabsTrigger>
            <TabsTrigger value="dashboard">學習儀表板</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            {/* Profile Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-center"
            >
              <Avatar className="mx-auto h-24 w-24 mb-4">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
              </Avatar>

              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">{user.username}</p>
              <p className="mt-2 text-sm">{user.bio}</p>

              <Button variant="outline" className="mt-4" onClick={() => setEditModalOpen(true)}>
                編輯個人資料
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 grid grid-cols-2 gap-3"
            >
              {/* Main Stat: Level & XP */}
              <Card className="col-span-2 overflow-hidden border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">目前等級</p>
                    <h3 className="text-3xl font-bold text-foreground">Lv.{resolvedProgression.level}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Award className="h-6 w-6 text-indigo-400" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>XP {resolvedProgression.totalXp - resolvedProgression.currentLevelFloor}</span>
                    <span>{resolvedProgression.nextLevelXp - resolvedProgression.currentLevelFloor}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${Math.min(100, Math.max(0, resolvedProgression.progress * 100))}%` }}
                    />
                  </div>
                </div>
              </Card>

              {/* Streak */}
              <Card className="col-span-1 border-white/10 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4 backdrop-blur-md">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 rounded-full bg-orange-500/20 p-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{user.streak}</div>
                  <div className="text-xs text-muted-foreground">連續登入</div>
                </div>
              </Card>

              {/* Coins */}
              <Card className="col-span-1 border-white/10 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 p-4 backdrop-blur-md">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 rounded-full bg-yellow-500/20 p-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{user.coins}</div>
                  <div className="text-xs text-muted-foreground">金幣</div>
                </div>
              </Card>

              {/* Knowledge Stats */}
              <Card className="col-span-2 border-white/10 bg-card/30 p-4 backdrop-blur-md">
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">學習成就</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">12</div>
                    <div className="text-[10px] text-muted-foreground">閱讀文檔</div>
                  </div>
                  <div className="text-center border-l border-border/50">
                    <div className="text-xl font-bold text-foreground">85</div>
                    <div className="text-[10px] text-muted-foreground">征服單詞</div>
                  </div>
                  <div className="text-center border-l border-border/50">
                    <div className="text-xl font-bold text-foreground">4h</div>
                    <div className="text-[10px] text-muted-foreground">專注時間</div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Menu Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 space-y-2"
            >
              <button className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-card/50 p-4 transition-all hover:bg-card">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                    <BackpackIcon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">我的背包</div>
                    <div className="text-xs text-muted-foreground">查看所有道具與筆記</div>
                  </div>
                </div>
                <div className="text-muted-foreground">›</div>
              </button>

              <button className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-card/50 p-4 transition-all hover:bg-card">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">我的發文</div>
                    <div className="text-xs text-muted-foreground">{user.posts} 篇貼文</div>
                  </div>
                </div>
                <div className="text-muted-foreground">›</div>
              </button>
            </motion.div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-0">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">載入學習數據中...</p>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Dashboard Sub Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <button
                    onClick={() => setDashboardSubTab('overview')}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      dashboardSubTab === 'overview'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    總覽
                  </button>
                  <button
                    onClick={() => setDashboardSubTab('concepts')}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      dashboardSubTab === 'concepts'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    概念分析
                  </button>
                <button
                    onClick={() => setDashboardSubTab('predictions')}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      dashboardSubTab === 'predictions'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Target className="h-4 w-4" />
                    成績預測
                </button>
        </div>

                {/* Overview Tab */}
                {dashboardSubTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="p-4 border-white/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-md">
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-2 rounded-full bg-blue-500/20 p-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            {proficiency?.overall_proficiency.toFixed(1) || '0'}
                          </div>
                          <div className="text-xs text-muted-foreground">總體熟練度</div>
                        </div>
                      </Card>

                      <Card className="p-4 border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md">
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-2 rounded-full bg-green-500/20 p-2">
                            <Zap className="h-5 w-5 text-green-500" />
            </div>
                          <div className="text-2xl font-bold text-foreground">
                            {proficiency?.accuracy_rate.toFixed(1) || '0'}%
            </div>
                          <div className="text-xs text-muted-foreground">正確率</div>
                      </div>
                      </Card>

                      <Card className="p-4 border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md">
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-2 rounded-full bg-purple-500/20 p-2">
                            <Target className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            {proficiency?.consistency_score.toFixed(1) || '0'}
                          </div>
                          <div className="text-xs text-muted-foreground">穩定性</div>
                        </div>
                      </Card>
                    </div>

                    {/* Proficiency Chart */}
                    {proficiency && (
                      <Card className="p-4 border-white/10 bg-card/50 backdrop-blur-md">
                        <ProficiencyChart
                          data={[{
                            date: new Date(proficiency.calculated_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
                            proficiency: proficiency.overall_proficiency,
                            accuracy: proficiency.accuracy_rate
                          }]}
                          title="學習進度追蹤"
                        />
                      </Card>
                    )}

                    {/* Recommendations */}
                    {prediction?.recommendations && prediction.recommendations.length > 0 && (
                      <Card className="p-4 border-white/10 bg-card/50 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">個人化學習建議</h3>
                        </div>
                        <div className="space-y-3">
                          {prediction.recommendations.slice(0, 3).map((rec, index) => (
                            <div
                              key={index}
                              className="p-3 bg-primary/5 rounded-lg border border-primary/10"
                            >
                              <h4 className="font-medium text-sm mb-1">
                                {rec.type === 'focus_concept' ? '🎯 加強概念' : '📈 增加練習'}
                                {rec.concept && `: ${rec.concept}`}
                              </h4>
                              <p className="text-xs text-muted-foreground">{rec.reason}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {!proficiency && !prediction && (
                      <Card className="p-6 text-center border-dashed">
                        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                          開始練習後，這裡會顯示你的學習數據與進度分析
                        </p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Concepts Tab */}
                {dashboardSubTab === 'concepts' && (
                  <div className="space-y-4">
                    {concepts.length > 0 ? (
                      <>
                        <Card className="p-4 border-white/10 bg-card/50 backdrop-blur-md">
                          <ConceptMasteryRadar
                            data={concepts.slice(0, 8).map(c => ({
                              concept: c.concept_tags.tag_name.split('-').join(' '),
                              mastery: c.mastery_level,
                              fullMark: 100
                            }))}
                            title="概念掌握雷達圖"
                          />
                        </Card>

                        <Card className="p-4 border-white/10 bg-card/50 backdrop-blur-md">
                          <h3 className="font-semibold mb-4">所有概念詳情</h3>
                          <div className="space-y-3">
                            {concepts.slice(0, 10).map((concept) => (
                              <div key={concept.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {concept.concept_tags.tag_name}
                                  </span>
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {concept.mastery_level.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${concept.mastery_level}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                              </>
                            ) : (
                      <Card className="p-6 text-center border-dashed">
                        <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                          開始練習後，這裡會顯示你的概念掌握度分析
                        </p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Predictions Tab */}
                {dashboardSubTab === 'predictions' && (
                  <div className="space-y-4">
                    {prediction ? (
                      <>
                        <Card className="p-4 border-white/10 bg-card/50 backdrop-blur-md">
                          <PredictionGauge
                            currentScore={prediction.currentScore}
                            predictedScore={prediction.predictions['14days'].examScore}
                            targetScore={15}
                            daysRemaining={14}
                          />
                        </Card>

                        <div className="grid grid-cols-2 gap-3">
                          <Card className="p-4 border-white/10 bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="h-4 w-4 text-orange-500" />
                              <h3 className="font-semibold text-sm">7 天後預測</h3>
                            </div>
                            <div className="text-2xl font-bold mb-2">
                              {prediction.predictions['7days'].examScore}
                              <span className="text-sm text-green-600 ml-1">
                                +{prediction.predictions['7days'].improvement.toFixed(1)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 transition-all duration-500"
                                style={{ width: `${prediction.predictions['7days'].confidence * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              信心度: {(prediction.predictions['7days'].confidence * 100).toFixed(0)}%
                            </p>
                          </Card>

                          <Card className="p-4 border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="h-4 w-4 text-purple-500" />
                              <h3 className="font-semibold text-sm">14 天後預測</h3>
                            </div>
                            <div className="text-2xl font-bold mb-2">
                              {prediction.predictions['14days'].examScore}
                              <span className="text-sm text-green-600 ml-1">
                                +{prediction.predictions['14days'].improvement.toFixed(1)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 transition-all duration-500"
                                style={{ width: `${prediction.predictions['14days'].confidence * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              信心度: {(prediction.predictions['14days'].confidence * 100).toFixed(0)}%
                            </p>
                          </Card>
                        </div>
                      </>
                    ) : (
                      <Card className="p-6 text-center border-dashed">
                        <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                          開始練習後，這裡會顯示你的成績預測與學習建議
                        </p>
                  </Card>
                    )}
            </div>
          )}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <button className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent">
                <Settings className="h-5 w-5" />
                <span>設定</span>
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg p-3 text-destructive transition-colors hover:bg-destructive/10">
                <LogOut className="h-5 w-5" />
                <span>登出</span>
              </button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Profile Avatar Modal */}
      <ProfileAvatarModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onAvatarUpdate={handleAvatarUpdate}
      />
    </>
  )
}
