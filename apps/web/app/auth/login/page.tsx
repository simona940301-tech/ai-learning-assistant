'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Chrome, Sparkles, ArrowRight, Check } from 'lucide-react'

/**
 * 登入/註冊頁面組件（內部實作）
 */
function AuthLoginPageContent() {
  const [isLogin, setIsLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { signIn, signUp, signInWithOAuth, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromReward = searchParams.get('from') === 'reward'

  // 如果已登入，重定向到 auth callback
  useEffect(() => {
    if (user) {
      router.push('/auth/callback')
    }
  }, [user, router])

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
      }
      // 成功後會自動導向 auth callback
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
              {fromReward ? (
                <>
                  <h1 className="text-6xl font-bold mb-6 leading-tight text-[#5D4037]">
                    保存你的<br />學習進度
                  </h1>
                  <p className="text-xl text-[#8B6F47] leading-relaxed mb-8">
                    註冊以保存測驗結果、錯題筆記和學習計劃
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-6xl font-bold mb-6 leading-tight text-[#5D4037]">
                    歡迎使用<br />PLMS 學習平台
                  </h1>
                  <p className="text-xl text-[#8B6F47] leading-relaxed mb-8">
                    開始 3 題訓練，AI 為你打造專屬學習計畫
                  </p>
                </>
              )}

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
              {isLogin ? '歡迎回來' : fromReward ? '保存你的進度' : '開始你的旅程'}
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
                  使用 Google 快速{isLogin ? '登入' : '註冊'}
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

/**
 * 登入/註冊頁面（包裝 Suspense）
 *
 * 使用時機：
 * - 在 Reward 頁面點擊「立即註冊」
 * - 用戶想保存匿名模式的進度
 */
export default function AuthLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#FAF6E9]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-[#FED168] border-t-transparent rounded-full"
          />
          <span className="text-[#5D4037] font-medium">載入中...</span>
        </div>
      </div>
    }>
      <AuthLoginPageContent />
    </Suspense>
  )
}





















