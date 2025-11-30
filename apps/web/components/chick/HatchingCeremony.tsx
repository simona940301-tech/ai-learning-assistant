'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EggAnimation } from './EggAnimation'
import { NamingForm } from './NamingForm'
import { FirstFeedTutorial } from './FirstFeedTutorial'
import { PurposeDeclaration } from './PurposeDeclaration'
import { useChickStore } from '@/src/store/chickStore'

type Stage = 'egg' | 'naming' | 'feeding' | 'purpose' | 'complete'

interface HatchingCeremonyProps {
    onComplete: () => void
}

export function HatchingCeremony({ onComplete }: HatchingCeremonyProps) {
    const [stage, setStage] = useState<Stage>('egg')
    const [chickName, setChickName] = useState('')
    const [userNickname, setUserNickname] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { hatchChick } = useChickStore()

    const handleEggHatched = () => {
        setStage('naming')
    }

    const handleNamingSubmit = async (chick: string, user: string) => {
        setChickName(chick)
        setUserNickname(user)

        setIsSubmitting(true)
        try {
            await hatchChick(chick, user)
            setStage('feeding')
        } catch (error) {
            console.error('[HatchingCeremony] Failed to save names:', error)
            setStage('feeding')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFeedingComplete = () => {
        setStage('purpose')
    }

    const handlePurposeComplete = () => {
        setStage('complete')
        // Small delay before calling onComplete to show final animation
        setTimeout(() => {
            onComplete()
        }, 500)
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#FFFBF0] overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235D4037' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
                <AnimatePresence mode="wait">
                    {stage === 'egg' && (
                        <motion.div
                            key="egg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-md"
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-[#1C1917] mb-2">
                                    你的夥伴即將誕生
                                </h1>
                                <p className="text-sm text-[#57534E]">
                                    輕觸蛋殼，喚醒沉睡的生命
                                </p>
                            </div>
                            <EggAnimation onHatched={handleEggHatched} />
                        </motion.div>
                    )}

                    {stage === 'naming' && (
                        <motion.div
                            key="naming"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-md"
                        >
                            <NamingForm onSubmit={handleNamingSubmit} />
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-[#FFFBF0]/80 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-[#FFB01A] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm text-[#57534E]">保存中...</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {stage === 'feeding' && (
                        <motion.div
                            key="feeding"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-md"
                        >
                            <FirstFeedTutorial
                                chickName={chickName}
                                onComplete={handleFeedingComplete}
                            />
                        </motion.div>
                    )}

                    {stage === 'purpose' && (
                        <motion.div
                            key="purpose"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-md"
                        >
                            <PurposeDeclaration
                                chickName={chickName}
                                userNickname={userNickname}
                                onComplete={handlePurposeComplete}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Stage progress indicator (top) */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {['egg', 'naming', 'feeding', 'purpose'].map((s, i) => (
                    <div
                        key={s}
                        className={`h-1 rounded-full transition-all duration-300 ${['egg', 'naming', 'feeding', 'purpose'].indexOf(stage) >= i
                            ? 'w-8 bg-[#FFB01A]'
                            : 'w-8 bg-[#E7E5E4]'
                            }`}
                    />
                ))}
            </div>
        </div>
    )
}
