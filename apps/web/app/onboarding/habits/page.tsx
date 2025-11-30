'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * 學習習慣調查頁面（5 題，基於 Hooked Model）
 * 
 * 題目設計：
 * 1. Trigger（觸發）- 什麼時候會想學習
 * 2. Action（行動）- 學習習慣偏好
 * 3. Variable Reward（變動獎勵）- 什麼讓你持續學習
 * 4. Investment（投資）- 你願意投入什麼
 * 5. 學習時間/頻率
 */

type HabitQuestion = {
  id: string
  question: string
  options: string[]
  category: string
}

const HABIT_QUESTIONS: HabitQuestion[] = [
  {
    id: 'trigger',
    question: '什麼時候你會想要開始學習？',
    options: [
      '看到同學進步或考試快到了',
      '每天固定時間，照計畫讀書',
      '感到靈感時',
      '同學或夥伴一起讀',
    ],
    category: 'trigger',
  },
  {
    id: 'learning_style',
    question: '你比較喜歡哪種學習方式？',
    options: [
      '一次做很多題（衝刺型）',
      '少量多次（長效型）',
      '有挑戰性的難題（挑戰型）',
      '循序漸進（穩健型）',
    ],
    category: 'learning_style',
  },
  {
    id: 'motivation',
    question: '什麼最能激勵你持續學習？',
    options: [
      '看到分數或進步',
      '解出難題的成就感',
      '拿獎勵或升級',
      '排行榜前進',
      '理解新知識的滿足感',
    ],
    category: 'motivation',
  },
  {
    id: 'pain_point',
    question: '你覺得學習上最大的困擾是什麼？',
    options: [
      '記了又忘，沒有複習節奏',
      '遇到變形題就不會',
      '解題步驟太複雜、卡住',
      '缺乏動力，很難每天開始學習',
    ],
    category: 'pain_point',
  },
  {
    id: 'plan_frequency',
    question: '你希望我們幫你打造哪種學習計劃？',
    options: [
      '每天',
      '每週 3–4 次',
      '每週 1–2 次',
      '不需要特別的計劃',
    ],
    category: 'plan_frequency',
  },
  {
    id: 'error_handling',
    question: '對於錯題，你覺得最浪費時間的是哪一部分？',
    options: [
      '總要花很多時間理解 AI 詳解（冗長）',
      '錯題只是想快速知道正解',
      '變形題太多，要花很多時間消化',
      '就算看懂還是常常無法舉一反三',
    ],
    category: 'error_handling',
  },
  {
    id: 'help_style',
    question: '當你遇到解不開的題目時，你最希望哪一種協助？',
    options: [
      'AI Check：讓 AI 找出我的思考漏洞',
      'Peer Help：學長姐解題',
      '最短詳解：直接給結論 + 步驟',
    ],
    category: 'help_style',
  },
  {
    id: 'time_commitment',
    question: '你一天願意投入多少時間？',
    options: [
      '5 分鐘',
      '10 分鐘',
      '15–20 分鐘',
      '30 分鐘以上',
    ],
    category: 'time_commitment',
  },
]

export default function OnboardingHabitsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/onboarding')
    }
  }, [user, authLoading, router])

  const handleSelect = (option: string) => {
    const question = HABIT_QUESTIONS[currentIndex]
    setAnswers((prev) => ({
      ...prev,
      [question.id]: option,
    }))
  }

  const handleNext = () => {
    if (currentIndex < HABIT_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setSaving(true)

    try {
      // 儲存到 onboarding_sessions
      const { data: session } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .update({
            scorecard_responses: answers,
            scorecard_submitted_at: new Date().toISOString(),
          })
          .eq('id', session.id)
      }

      // 導向完成頁面
      router.push('/onboarding/complete')
    } catch (error) {
      console.error('[Habits] Failed to save:', error)
      // 即使失敗也導向完成頁面
      router.push('/onboarding/complete')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || saving) {
    return <PremiumLoader message={saving ? '儲存中...' : '載入中...'} />
  }

  if (!user) {
    return null
  }

  const currentQuestion = HABIT_QUESTIONS[currentIndex]
  const currentAnswer = answers[currentQuestion.id]
  const progress = ((currentIndex + 1) / HABIT_QUESTIONS.length) * 100

  return (
    <div className="min-h-screen bg-[#FAF6E9] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8B6F47]">
              問題 {currentIndex + 1} / {HABIT_QUESTIONS.length}
            </span>
            <span className="text-sm text-[#8B6F47]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#E0D0B8] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-[#FED168] rounded-full"
            />
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-[#FFFDF5] rounded-3xl p-8 border-2 border-[#E0D0B8] shadow-lg mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FED168] flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-[#5D4037]" />
            </div>
            <h2 className="text-2xl font-bold text-[#5D4037]">學習習慣調查</h2>
          </div>

          <h3 className="text-xl font-semibold text-[#5D4037] mb-8 leading-relaxed">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer === option
              return (
                <motion.button
                  key={index}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all ${isSelected
                      ? 'bg-[#FED168] border-[#FED168] shadow-md'
                      : 'bg-white border-[#E0D0B8] hover:border-[#FED168] hover:bg-[#F8F5E8]'
                    }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-[#5D4037] font-medium">{option}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentIndex > 0 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 h-14 border-2 border-[#E0D0B8] text-[#5D4037] rounded-xl hover:bg-[#F8F5E8]"
            >
              上一題
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!currentAnswer}
            className="flex-1 h-14 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {currentIndex < HABIT_QUESTIONS.length - 1 ? (
              <>
                下一題
                <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              '完成調查'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

