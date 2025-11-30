'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Sparkles, Trophy, Coins, Award } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * STEP 3 — 入門練習介紹 (Challenge Intro)
 * 
 * 目的: 設定期望，說明接下來的 3 題測驗
 * 心理學原理: Anticipation（期待感）- 預告獎勵提升動機
 */

export default function OnboardingIntroPage() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const [sessionId, setSessionId] = useState<string | null>(null)

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/onboarding')
        }
    }, [user, authLoading, router])

    // Get session
    useEffect(() => {
        async function fetchSession() {
            if (!user) return

            const { data: session } = await supabaseBrowserClient
                .from('onboarding_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'in_progress')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (session) {
                setSessionId(session.id)
            }
        }

        if (user && !authLoading) {
            fetchSession()
        }
    }, [user, authLoading])

    const handleStartChallenge = () => {
        router.push('/onboarding/challenge')
    }

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="mb-4 text-5xl"
                    >
                        ⏳
                    </motion.div>
                    <p className="text-lg text-gray-600 dark:text-gray-400">載入中...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-[#FFFBF0] px-4 py-6 overflow-hidden flex flex-col font-sans">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-3xl border border-[#F5F5F4] p-8 shadow-sm"
                >
                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-[#FFFBF0] border border-[#F5F5F4] flex items-center justify-center shadow-sm">
                            <Sparkles className="w-10 h-10 text-[#FFB01A]" strokeWidth={1.5} />
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-[28px] font-semibold text-center mb-3 text-[#1C1917] font-display tracking-tight"
                    >
                        為你準備的入門練習
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-[15px] text-center text-[#57534E] mb-10 font-normal"
                    >
                        根據你的目標，我們設計了 3 分鐘的挑戰
                    </motion.p>

                    {/* Features */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-3 mb-10"
                    >
                        {[
                            { icon: '📝', text: '3 題精選英文題目' },
                            { icon: '🎚️', text: '根據您的程度調整難度' },
                            { icon: '🤖', text: '即時 AI 對手挑戰' },
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 + index * 0.1 }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-[#FAFAF9] border border-[#F5F5F4]"
                            >
                                <span className="text-2xl">{feature.icon}</span>
                                <p className="text-[15px] font-medium text-[#1C1917]">{feature.text}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Rewards Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="rounded-xl border border-dashed border-[#FFB01A]/30 bg-[#FFFBF0] p-5 mb-8"
                    >
                        <p className="text-[13px] font-medium text-[#57534E] mb-4 text-center">
                            完成後可獲得：
                        </p>
                        <div className="flex items-center justify-center gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-2 rounded-lg bg-white border border-[#F5F5F4]">
                                    <Coins className="w-5 h-5 text-[#FFB01A]" strokeWidth={1.5} />
                                </div>
                                <span className="text-[12px] text-[#A8A29E]">金幣獎勵</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-2 rounded-lg bg-white border border-[#F5F5F4]">
                                    <Trophy className="w-5 h-5 text-[#FFB01A]" strokeWidth={1.5} />
                                </div>
                                <span className="text-[12px] text-[#A8A29E]">經驗值</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-2 rounded-lg bg-white border border-[#F5F5F4]">
                                    <Award className="w-5 h-5 text-[#FFD580]" strokeWidth={1.5} />
                                </div>
                                <span className="text-[12px] text-[#A8A29E]">新手徽章</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="text-center"
                    >
                        <Button
                            onClick={handleStartChallenge}
                            className="w-full h-14 text-[16px] font-bold bg-[#FFB01A] hover:bg-[#E69500] text-white rounded-xl shadow-[0_4px_14px_rgba(255,176,26,0.4)] hover:shadow-[0_6px_20px_rgba(255,176,26,0.6)] transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                            開始練習 🚀
                        </Button>
                    </motion.div>

                    {/* Progress Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.1 }}
                        className="mt-6"
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
                            <div className="h-1.5 w-1.5 rounded-full bg-[#E7E5E4]" />
                            <div className="h-1.5 w-6 rounded-full bg-[#FFB01A]" />
                        </div>
                        <p className="mt-3 text-[12px] text-center text-[#A8A29E]">
                            Step 3/3 · 入門練習
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}
