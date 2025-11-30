'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabase'
import { AvatarSelector } from '@/components/avatar/AvatarSelector'
import { getAvatarPreset, AVATAR_PRESETS } from '@/lib/avatar/presets'
import { HatchingCeremony } from '@/components/chick/HatchingCeremony'

/**
 * STEP 4 — 選擇頭像 (Avatar Selection)
 *
 * Onboarding 流程的最後一步，讓用戶選擇頭像
 * 然後完成 onboarding 並跳轉到 play 頁面
 */
export default function OnboardingAvatarPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showHatching, setShowHatching] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/onboarding')
    }
  }, [user, authLoading, router])

  // Load current avatar selection
  useEffect(() => {
    async function init() {
      if (!user) return

      try {
        // Get current profile avatar
        const { data: profile } = await supabaseBrowserClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()

        if (profile?.avatar_url) {
          // Try to match with preset
          const presets = Object.values(getAvatarPreset).filter(Boolean)
          const matchingPreset = presets.find(preset =>
            preset?.imageUrl === profile.avatar_url
          )
          if (matchingPreset) {
            setSelectedPresetId(matchingPreset.id)
          }
        }

        // Get session
        const { data: session } = await supabaseBrowserClient
          .from('onboarding_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (session) {
          setSessionId(session.id)
        }
      } catch (error) {
        console.error('[Avatar] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && !authLoading) {
      init()
    }
  }, [user, authLoading])

  const handlePresetSelect = (preset: any) => {
    if (saving) return
    setSelectedPresetId(preset.id)
  }

  const handleConfirm = async () => {
    if (!user || !selectedPresetId || saving) return

    setSaving(true)

    try {
      const preset = getAvatarPreset(selectedPresetId)
      if (!preset) {
        setSaving(false)
        return
      }

      // Update profile with selected avatar
      await supabaseBrowserClient
        .from('profiles')
        .update({
          avatar_url: preset.imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Update session step (not completed yet - still need to complete habits survey)
      if (sessionId) {
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .update({
            current_step: 4, // Avatar selection completed
          })
          .eq('id', sessionId)
      }

      // Small delay for visual feedback, then show hatching ceremony
      setTimeout(() => {
        setSaving(false)
        setShowHatching(true)
      }, 300)
    } catch (error) {
      console.error('[Avatar] Failed to save:', error)
      setSaving(false)
    }
  }

  const handleHatchingComplete = () => {
    // 完成破殼儀式後，導向學習習慣問卷
    router.push('/onboarding/habits')
  }

  if (authLoading || loading) {
    return <PremiumLoader message="載入中..." />
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF6E9] px-6 py-8">
      <AnimatePresence mode="wait">
        {showHatching ? (
          <HatchingCeremony key="hatching" onComplete={handleHatchingComplete} />
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FED168] shadow-lg"
              >
                <Sparkles className="h-10 w-10 text-[#5D4037]" />
              </motion.div>
              <h1 className="text-4xl font-bold text-[#5D4037] mb-3">
                選擇你的頭像
              </h1>
            </motion.div>

            {/* Guidance Bubble */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="relative mx-auto max-w-md">
                {/* Speech Bubble */}
                <div className="relative rounded-2xl bg-[#FFFDF5] border-2 border-[#FED168] p-4 shadow-lg">
                  <div className="text-center text-[#5D4037] text-sm leading-relaxed">
                    點擊選擇一個你喜歡的頭像
                  </div>
                  {/* Bubble Tail */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    <div className="h-6 w-6 rotate-45 border-r-2 border-b-2 border-[#FED168] bg-[#FFFDF5]"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Avatar Selector - Only show student avatars */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#FFFDF5] rounded-3xl p-8 border-2 border-[#E0D0B8] shadow-lg"
            >
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                {AVATAR_PRESETS.filter(avatar => avatar.category === 'student' && (avatar.id === 'student-01' || avatar.id === 'student-02')).map((avatar) => {
                  const isSelected = selectedPresetId === avatar.id
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => handlePresetSelect(avatar)}
                      className="group relative"
                      disabled={saving}
                    >
                      <motion.div
                        className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-3 transition-all ${isSelected
                            ? 'border-[#FED168] shadow-lg shadow-[#FED168]/30'
                            : 'border-[#E0D0B8] hover:border-[#FED168] hover:shadow-md'
                          }`}
                        style={{
                          backgroundColor: 'transparent',
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <img
                          src={avatar.imageUrl}
                          alt={avatar.name}
                          className="h-full w-full object-contain rounded-xl"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.emoji-fallback');
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div className="emoji-fallback absolute inset-0 flex items-center justify-center text-4xl" style={{ display: 'none' }}>
                          {avatar.emoji}
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg"
                            style={{ backgroundColor: '#FED168' }}
                          >
                            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.div>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* Confirm Button */}
            {selectedPresetId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="w-full h-14 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] font-bold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <div className="inline-flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 border-2 border-[#5D4037] border-t-transparent rounded-full"
                      />
                      <span>設定中...</span>
                    </div>
                  ) : (
                    '確認'
                  )}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
