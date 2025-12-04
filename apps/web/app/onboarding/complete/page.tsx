'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { motion } from 'framer-motion'
import { CheckCircle, Bell, ArrowRight, Sparkles } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabase'
import { generatePersonalPlan } from '@/lib/onboarding/plan-generator'

/**
 * 註冊完成頁面
 * 
 * 顯示：
 * - 恭喜完成註冊
 * - 24小時內制定個人計劃的通知
 * - 開啟通知提醒
 * - 導向 /home
 */

export default function OnboardingCompletePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [requestingNotification, setRequestingNotification] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/onboarding')
      return
    }

    if (user) {
      // 完成 onboarding
      completeOnboarding()
    }
  }, [user, authLoading, router])

  const completeOnboarding = async () => {
    if (!user) return

    // 🚨 Critical: 強制阻擋 Mock User
    if (user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53' || user.email === 'dev@test.com') {
      console.warn('[Complete] 🚨 強制阻擋 Mock User，執行登出')
      await supabaseBrowserClient.auth.signOut()
      setLoading(false)
      return
    }

    try {
      // 1. Get session data for plan generation
      const { data: session } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 2. Get profile data
      const { data: profile } = await supabaseBrowserClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // 3. Generate and Save Personal Plan
      if (session && profile) {
        try {
          // Analyze weak areas from challenge results
          const weakAreas = new Set<string>()
          const results = session.challenge_results || []

          // Simple heuristic: if wrong answer in a category, mark as weak
          // Since we don't have explicit category in results, we might need to infer or use task config
          // For now, let's use the task config if available, or infer from questions if possible
          // Or just use a default set if we can't determine

          // Better approach: Fetch the task config we just created in Reward step
          const { data: taskConfig } = await supabaseBrowserClient
            .from('onboarding_task_configs')
            .select('weak_areas')
            .eq('user_id', user.id)
            .maybeSingle()

          const finalWeakAreas = taskConfig?.weak_areas || []

          const planMarkdown = generatePersonalPlan({
            userName: profile.full_name || profile.username || '同學',
            goal: {
              target_university: session.target_university || profile.target_university || '理想大學',
              target_department: session.target_department || profile.target_department || '理想科系',
              current_grade: session.current_grade || '高中',
              mock_exam_level: session.mock_exam_level || 8,
            },
            habits: session.scorecard_responses || {},
            challenge: {
              score: session.challenge_score || 0,
              weak_areas: finalWeakAreas,
              results: session.challenge_results || [],
            }
          })

          // Save to Backpack
          await supabaseBrowserClient
            .from('backpack_notes')
            .insert({
              user_id: user.id,
              question: '我的專屬學習計畫', // Title
              canonical_skill: 'general',
              note_md: planMarkdown,
              folder: '個人計畫',
              tags: ['學習計畫', 'Onboarding'],
              created_at: new Date().toISOString(),
            })

          console.log('[Complete] Personal plan generated and saved')
        } catch (planError) {
          console.error('[Complete] Failed to generate plan:', planError)
          // Don't block completion if plan fails
        }
      }

      // 4. Update session status - 🔧 改為 upsert 避免衝突
      if (session) {
        try {
          const updateData = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            // 保留可能存在的 challenge 資料，避免覆蓋
          }
          
          // 使用更寬鬆的更新策略，允許部分失敗
          const { error: sessionUpdateError } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .update(updateData)
            .eq('id', session.id)
          
          if (sessionUpdateError) {
            console.warn('[Complete] Session update failed (non-critical):', sessionUpdateError)
            // 不拋出錯誤，繼續執行其他步驟
          } else {
            console.log('[Complete] ✅ Session updated successfully')
          }
        } catch (sessionError) {
          console.warn('[Complete] Session update exception (non-critical):', sessionError)
          // 繼續執行，不讓 session 更新失敗阻礙整個流程
        }
      }

      // 5. Update profile - mark onboarding as completed
      await supabaseBrowserClient
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // Set onboarding completed flag
      sessionStorage.setItem('first_run_after_onboarding', 'true')

      setLoading(false)
    } catch (error) {
      console.error('[Complete] Failed to complete onboarding:', error)
      setLoading(false)
    }
  }

  const handleEnableNotification = async () => {
    if ('Notification' in window) {
      setRequestingNotification(true)
      try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          setNotificationEnabled(true)
          // 可以在這裡儲存通知偏好到資料庫
        }
      } catch (error) {
        console.error('[Complete] Failed to request notification:', error)
      } finally {
        setRequestingNotification(false)
      }
    } else {
      // 瀏覽器不支援通知
      alert('您的瀏覽器不支援通知功能')
    }
  }

  const handleContinue = () => {
    router.push('/home')
  }

  // Note: 已整合到 /home 頁面

  if (authLoading || loading) {
    return <PremiumLoader message="完成註冊中..." />
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF6E9] px-6 py-8 flex items-center justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-[#528555] shadow-lg"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-[#5D4037] mb-4"
          >
            恭喜完成註冊！
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-[#8B6F47] mb-8 leading-relaxed"
          >
            您的專屬個人計劃會在 24 小時內由台大團隊制定完畢
          </motion.p>

          {/* Notification Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#FFFDF5] rounded-3xl p-8 border-2 border-[#E0D0B8] shadow-lg mb-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FED168] flex items-center justify-center">
                <Bell className="h-6 w-6 text-[#5D4037]" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-bold text-[#5D4037] mb-1">
                  開啟通知以免錯過訊息！
                </h3>
                <p className="text-sm text-[#8B6F47]">
                  計劃完成後會立即通知您
                </p>
              </div>
            </div>

            {!notificationEnabled ? (
              <Button
                onClick={handleEnableNotification}
                disabled={requestingNotification}
                className="w-full h-14 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestingNotification ? (
                  '處理中...'
                ) : (
                  <>
                    <Bell className="h-5 w-5" />
                    開啟通知
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-[#528555] py-4">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">通知已開啟</span>
              </div>
            )}
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleContinue}
              className="w-full h-16 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] rounded-2xl text-lg font-bold shadow-lg flex items-center justify-center gap-2"
            >
              開始使用
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Decorative Elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 flex justify-center gap-2"
          >
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                className="w-2 h-2 rounded-full bg-[#FED168]"
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

