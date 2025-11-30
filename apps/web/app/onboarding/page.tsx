'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Chrome, Sparkles, ArrowRight, Check } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabase'

export default function OnboardingLoginPage() {
  const [isLogin, setIsLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { signIn, signUp, signInWithOAuth, user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect logic: 
  // - If not logged in, check if has anonymous data (completed challenge)
  // - If logged in, check onboarding status and redirect accordingly
  useEffect(() => {
    // Wait for auth state to fully load and ensure we're not in the middle of a login attempt
    if (authLoading || loading) return // 等待 auth 載入完成，並且不在登入過程中

    // If not logged in, check if user has completed challenge (anonymous data)
    if (!user) {
      // Check if coming from reward page (has from=reward param)
      const urlParams = new URLSearchParams(window.location.search)
      const fromReward = urlParams.get('from') === 'reward'

      // Check if has anonymous data (completed challenge)
      const hasAnonymousData =
        sessionStorage.getItem('onboarding_challenge_score') ||
        sessionStorage.getItem('onboarding_challenge_results') ||
        localStorage.getItem('onboarding_anonymous_data')

      if (fromReward || hasAnonymousData) {
        // Coming from reward page or has completed challenge, stay on login/register page
        // Don't redirect to goal, user should register to save progress
        return
      }

      // No anonymous data, redirect to goal page to start anonymous onboarding
      router.push('/onboarding/goal')
      return
    }

    if (user) {
      // User exists, but need to verify session is valid
      const currentUser = user
      // Small delay to prevent flash of login page
      const timer = setTimeout(() => {
        async function checkOnboarding() {
          try {
            // 先檢查 session 是否有效
            const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()

            // 如果沒有有效的 session，留在登入頁面
            if (sessionError || !sessionData?.session) {
              console.log('[Onboarding] No valid session, staying on login page')
              return
            }

            // 有有效 session，檢查 onboarding 狀態
            const { data, error } = await supabaseBrowserClient
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', currentUser.id)
              .maybeSingle()

            // 如果查詢出錯（認證錯誤），留在登入頁面
            if (error) {
              const isAuthError =
                (error as any).status === 401 ||
                (error as any).status === 403 ||
                (error as any).status === 406 ||
                error.message?.includes('JWT') ||
                error.message?.includes('authentication') ||
                error.message?.includes('Unauthorized')

              if (isAuthError) {
                console.log('[Onboarding] Authentication error, staying on login page')
                return
              }
            }

            // 有效 session 且有 profile 記錄，根據 onboarding 狀態導向
            if (data?.onboarding_completed) {
              // 已完成 onboarding，導向首頁
              router.push('/home')
            } else {
              // 未完成 onboarding - 智能判斷應該導向哪個步驟
              const { data: session } = await supabaseBrowserClient
                .from('onboarding_sessions')
                .select('challenge_completed_at, scorecard_submitted_at')
                .eq('user_id', currentUser.id)
                .eq('status', 'in_progress')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              const { data: profileData } = await supabaseBrowserClient
                .from('profiles')
                .select('avatar_url')
                .eq('id', currentUser.id)
                .maybeSingle()

              // 智能路由：根據完成進度導向正確的步驟
              if (session?.scorecard_submitted_at) {
                // 已完成問卷，導向完成頁
                router.push('/onboarding/complete')
              } else if (session?.challenge_completed_at) {
                // 已完成 challenge，檢查頭像
                if (profileData?.avatar_url) {
                  // 有頭像，導向問卷
                  router.push('/onboarding/habits')
                } else {
                  // 無頭像，導向頭像頁
                  router.push('/onboarding/avatar')
                }
              } else {
                // 從頭開始 onboarding
                router.push('/onboarding/goal')
              }
            }
          } catch (error) {
            console.error('[Onboarding] Error checking status:', error)
            // 發生錯誤時，留在登入頁面
          }
        }
        checkOnboarding()
      }, 300)

      return () => clearTimeout(timer)
    }
    // If no user, stay on this page to show login form (including Google login button)
  }, [user, authLoading, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        // 註冊時，name 必填
        if (!name || name.trim() === '') {
          setError('請輸入使用者名稱')
          setLoading(false)
          return
        }
        await signUp(email, password, name.trim())

        // 註冊成功後，遷移 localStorage 資料
        await migrateAnonymousData()
      }
      // Redirect handled by AuthProvider (will go to /play)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
    }
  }

  // 遷移匿名測驗資料到資料庫
  const migrateAnonymousData = async () => {
    try {
      const stored = localStorage.getItem('onboarding_anonymous_data')
      if (!stored) return

      const data = JSON.parse(stored)
      const { data: userData } = await supabaseBrowserClient.auth.getUser()
      if (!userData?.user) return

      const user = userData.user

      // 準備 session 資料
      const sessionData: any = {
        user_id: user.id,
        current_step: 3, // 已完成 challenge，準備進入 reward
        status: 'in_progress', // 明確標記為進行中
        mock_exam_level: data.goalData?.mock_exam_level || data.userLevel || 8,
      }

      // 如果有 goalData，加入目標設定資料
      if (data.goalData) {
        sessionData.target_university = data.goalData.target_university
        sessionData.target_department = data.goalData.target_department
        sessionData.is_exploring = data.goalData.is_exploring
        sessionData.current_grade = data.goalData.current_grade
        if (data.goalData.mock_exam_level) {
          sessionData.mock_exam_level = data.goalData.mock_exam_level
        }
      }

      // 如果有 challenge 資料，加入測驗結果
      if (data.startedAt) {
        sessionData.challenge_started_at = data.startedAt
        sessionData.challenge_completed_at = new Date().toISOString()
      }
      if (data.results && data.results.length > 0) {
        sessionData.challenge_score = data.results.filter((r: any) => r.isCorrect).length
        sessionData.challenge_question_ids = data.questions?.map((q: any) => q.id) || []
        sessionData.challenge_results = data.results.map((r: any) => ({
          question_id: r.questionId,
          is_correct: r.isCorrect,
          time_ms: r.timeMs,
          answer_selected: r.answerSelected,
        }))
        // 確保 challenge_completed_at 已設置（如果還沒有）
        if (!sessionData.challenge_completed_at) {
          sessionData.challenge_completed_at = new Date().toISOString()
        }
      }

      // 創建 onboarding session
      const { data: session } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .insert(sessionData)
        .select()
        .single()

      // 更新 profile（如果有目標設定資料）
      if (data.goalData) {
        await supabaseBrowserClient
          .from('profiles')
          .update({
            target_university: data.goalData.target_university,
            target_department: data.goalData.target_department,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      // 清除 localStorage
      localStorage.removeItem('onboarding_anonymous_data')
      sessionStorage.removeItem('onboarding_challenge_score')
      sessionStorage.removeItem('onboarding_challenge_results')
      sessionStorage.removeItem('onboarding_challenge_questions')
    } catch (error) {
      console.error('[Onboarding] Failed to migrate anonymous data:', error)
      // 不阻擋註冊流程，只記錄錯誤
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      setGoogleLoading(true)
      await signInWithOAuth('google')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 登錄失敗')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Image/Visual */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-[#FAF6E9] overflow-hidden border-r border-[#E0D0B8]">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235D4037' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#FED168]/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#528555]/10 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-[#5D4037]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#FED168] border border-[#E0D0B8] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-[#5D4037]" />
                </div>
                <span className="text-3xl font-bold tracking-tight text-[#5D4037]">PLMS</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-lg"
            >
              <h1 className="text-6xl font-bold mb-6 leading-tight text-[#5D4037]">
                歡迎使用<br />PLMS 學習平台
              </h1>
              <p className="text-xl text-[#8B6F47] leading-relaxed mb-8">
                開始 3 題訓練，AI 為你打造專屬學習計畫
              </p>

              {/* Features List */}
              <div className="space-y-4">
                {[
                  '即時 AI 解題與詳解',
                  '個人化學習路徑',
                  '智能錯題本與複習',
                ].map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#528555]/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#528555]" />
                    </div>
                    <span className="text-base text-[#5D4037]">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2">
            <motion.div
              className="h-1 rounded-full bg-[#528555]"
              initial={{ width: 8 }}
              animate={{ width: 32 }}
              transition={{ duration: 0.3 }}
            />
            <div className="w-8 h-1 rounded-full bg-[#E0D0B8]" />
            <div className="w-8 h-1 rounded-full bg-[#E0D0B8]" />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#FED168] flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-[#5D4037]" />
            </div>
            <span className="text-2xl font-bold">PLMS</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {isLogin ? '歡迎回來' : '開始你的旅程'}
            </h2>
            <p className="text-muted-foreground text-base">
              {isLogin ? '繼續你的學習進度' : '加入數千名學生，提升學習效率'}
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span className="flex-1">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google OAuth Button - Primary CTA */}
          <div className="mb-6">
            <Button
              type="button"
              className="w-full h-12 bg-background text-foreground border-2 border-border hover:border-primary hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md font-medium text-base relative overflow-hidden group"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              <div className="absolute inset-0 bg-[#FED168]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {googleLoading ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5"
                  >
                    <Chrome className="w-5 h-5" />
                  </motion.div>
                  <span>正在連接...</span>
                </div>
              ) : (
                <>
                  <Chrome className="mr-2 h-5 w-5 text-[#528555]" />
                  使用 Google 快速登入
                  <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              安全、快速，無需記憶密碼
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground font-medium">
                或使用電子郵件
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="name" className="text-sm font-medium">
                    使用者名稱 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="王小明"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 border-border focus:border-primary transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                電子郵件
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-[#528555] transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 border-border focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  密碼
                </Label>
                {isLogin && (
                  <button
                    type="button"
                    className="text-xs text-[#528555] hover:text-[#4A7A4D] font-medium"
                  >
                    忘記密碼？
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-[#528555] transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 6 個字元"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pl-10 pr-10 border-border focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] font-medium shadow-lg shadow-[#FED168]/30 hover:shadow-xl hover:shadow-[#FED168]/40 transition-all duration-200 group"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#5D4037] border-t-transparent rounded-full"
                  />
                  <span>處理中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{isLogin ? '登入' : '建立帳號'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-center text-sm"
          >
            <span className="text-muted-foreground">
              {isLogin ? '還沒有帳號？' : '已經有帳號？'}
            </span>{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
              }}
              className="text-[#528555] font-medium hover:text-[#4A7A4D] hover:underline transition-colors"
              disabled={loading || googleLoading}
            >
              {isLogin ? '立即註冊' : '立即登入'}
            </button>
          </motion.div>

          {/* Privacy Notice */}
          <p className="mt-8 text-xs text-center text-muted-foreground">
            繼續即表示你同意我們的
            <button type="button" className="underline hover:text-foreground transition-colors mx-1">
              服務條款
            </button>
            和
            <button type="button" className="underline hover:text-foreground transition-colors ml-1">
              隱私政策
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
