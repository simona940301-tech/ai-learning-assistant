'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Search, FileCheck, PartyPopper, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'

interface DetectiveCelebrationProps {
    caseTitle: string
    difficulty: number
    accuracy: number
    onClose: () => void
}

/**
 * DetectiveCelebration - Noir-style celebration for solving a case
 * 
 * Features:
 * - Cinematic "Case Closed" stamp effect
 * - Noir color palette (Amber/Black/Slate)
 * - Typewriter effect for case summary
 * - Dynamic confetti based on performance
 */
export function DetectiveCelebration({
    caseTitle,
    difficulty,
    accuracy,
    onClose,
}: DetectiveCelebrationProps) {
    const [stage, setStage] = useState<'stamp' | 'summary' | 'rewards'>('stamp')

    // Cinematic Sequence
    useEffect(() => {
        // 1. Stamp Effect (0s)
        const playConfetti = () => {
            // Golden Noir Confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#d97706', '#f59e0b', '#78350f'],
                disableForReducedMotion: true
            })
        }

        setTimeout(() => {
            playConfetti()
            setStage('summary')
        }, 2000)

        setTimeout(() => {
            setStage('rewards')
        }, 4000)
    }, [])

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md"
            >
                <div className="relative w-full max-w-2xl px-4">

                    {/* Spotlight Effect Background */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)] pointer-events-none" />

                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="relative bg-[#1e293b] border border-slate-700 shadow-2xl rounded-sm overflow-hidden"
                    >
                        {/* Folder Tab Visual */}
                        <div className="absolute top-0 right-0 w-32 h-8 bg-[#f59e0b] -translate-y-2 translate-x-8 rotate-12 opacity-80" />

                        <div className="p-8 md:p-12 space-y-8 relative z-10">

                            {/* Header: CASE CLOSED Stamp */}
                            <div className="relative text-center py-4">
                                <motion.div
                                    initial={{ scale: 2, opacity: 0, rotate: -15 }}
                                    animate={{ scale: 1, opacity: 1, rotate: -5 }}
                                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                    className="border-4 border-red-700 text-red-700 font-black text-5xl md:text-7xl inline-block px-4 py-2 uppercase tracking-tighter opacity-80 rotate-[-5deg] mask-ink"
                                    style={{ textShadow: '0 0 2px rgba(185, 28, 28, 0.5)' }}
                                >
                                    CASE CLOSED
                                </motion.div>

                                <motion.h2
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                    className="mt-6 text-xl text-slate-300 font-serif"
                                >
                                    <span className="text-amber-500 font-bold">Case:</span> {caseTitle}
                                </motion.h2>
                            </div>

                            {/* Summary Report */}
                            <AnimatePresence mode="wait">
                                {stage !== 'stamp' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                                                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Detective Rating</div>
                                                <div className="text-2xl font-mono text-amber-500">
                                                    {accuracy >= 90 ? 'MASTER' : accuracy >= 70 ? 'SENIOR' : 'ROOKIE'}
                                                </div>
                                            </div>
                                            <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                                                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Accuracy</div>
                                                <div className="text-2xl font-mono text-emerald-500">{accuracy}%</div>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-700 pt-6">
                                            <p className="font-handwriting text-xl text-slate-400 leading-relaxed">
                                                {`"Another mystery solved. The city sleeps a little safer tonight thanks to your work."`}
                                            </p>
                                            <p className="text-right text-sm text-slate-600 mt-2 font-mono">- Chief Inspector</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Actions */}
                            {stage === 'rewards' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-4"
                                >
                                    <Button
                                        onClick={onClose}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 text-lg tracking-wide shadow-lg shadow-amber-900/20"
                                    >
                                        RETURN TO HEADQUARTERS <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </motion.div>
                            )}

                        </div>

                        {/* Cinematic Noise Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
