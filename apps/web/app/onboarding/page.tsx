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
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { signIn, signUp, signInWithOAuth, user, loading: authLoading } = useAuth()
  const router = useRouter()

  // If already logged in, check if onboarding completed
  // Only redirect if user is already logged in (not during initial load)
  useEffect(() => {
    // Only check if we're not in the middle of a login attempt
    if (user && !authLoading && !loading) {
      // Small delay to prevent flash of login page
      const timer = setTimeout(() => {
        // Check if user has completed onboarding
        supabaseBrowserClient
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.onboarding_completed) {
              // Already completed onboarding, go to app
              router.push('/play')
            } else {
              // Not completed, go to goal selection
              router.push('/onboarding/goal')
            }
          })
          .catch(() => {
            // Profile doesn't exist or error, go to goal selection
            router.push('/onboarding/goal')
          })
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [user, authLoading, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password, name || undefined)
      }
      // Redirect handled by AuthProvider (will go to /play)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(false)
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
      <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
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
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"
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
            className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
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
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold tracking-tight">PLMS</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-lg"
            >
              <h1 className="text-6xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                AI 驅動的<br />個人化學習
              </h1>
              <p className="text-xl opacity-90 leading-relaxed mb-8">
                智能適應你的學習節奏，讓每一次練習都更有效率
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
                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-base opacity-90">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2">
            <motion.div
              className="h-1 rounded-full bg-white"
              initial={{ width: 8 }}
              animate={{ width: 32 }}
              transition={{ duration: 0.3 }}
            />
            <div className="w-8 h-1 rounded-full bg-white/30" />
            <div className="w-8 h-1 rounded-full bg-white/30" />
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
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
                className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm"
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
              className="w-full h-12 bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-base relative overflow-hidden group"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <Chrome className="mr-2 h-5 w-5 text-blue-600" />
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
                    姓名（選填）
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="王小明"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 border-gray-200 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                電子郵件
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 border-gray-200 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
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
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    忘記密碼？
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 6 個字元"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pl-10 pr-10 border-gray-200 dark:border-gray-800 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
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
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-200 group"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
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
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
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

