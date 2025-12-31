'use client'

/**
 * PVEResultModal - Premium result screen for PVE battles
 * 
 * Design Philosophy (inspired by Duolingo, Khan Academy, Quizlet):
 * 1. Immediate positive reinforcement (celebrate wins, encourage on losses)
 * 2. Learning-first approach (wrong questions take center stage)
 * 3. Minimal cognitive load (single page, clear hierarchy)
 * 4. Gamification with purpose (XP/coins support learning goals)
 * 5. Warm, encouraging tone (growth mindset)
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Target, Sparkles, ArrowRight, RotateCcw, X, Check, Bookmark } from 'lucide-react'
import { usePlay, type BattleState } from '@/lib/play-context'
import { useAuth } from '@/lib/auth-context'
import { LottieAnimation } from '@/components/ui/LottieAnimation'
import { notify } from '@/lib/utils/toast-helper'
import ReactMarkdown from 'react-markdown'
import { TutorialBubble } from '@/components/ui/tutorial-bubble'

interface WrongQuestion {
    id: string
    questionText: string
    options: string[]
    correctAnswer: 'A' | 'B' | 'C' | 'D'
    userAnswer: 'A' | 'B' | 'C' | 'D' | null
    explanation?: string
    difficulty?: number
}

interface PVEResultModalProps {
    isOpen: boolean
    onClose: () => void
    onPlayAgain: () => void
}

export const PVEResultModal = React.memo(function PVEResultModal({ isOpen, onClose, onPlayAgain }: PVEResultModalProps) {
    const { user } = useAuth()
    const { battleState, progression } = usePlay()

    // 🎯 FIX: Use ref to snapshot battleState when modal opens
    // This prevents recalculation when battleState changes (e.g., isInBattle: false)
    const battleStateSnapshotRef = React.useRef<BattleState | null>(null)

    // Snapshot battleState when modal opens
    React.useEffect(() => {
        if (isOpen && battleState && !battleStateSnapshotRef.current) {
            console.log('[PVE Result] 📸 Snapshotting battleState for results calculation')
            battleStateSnapshotRef.current = battleState
        } else if (!isOpen) {
            // Clear snapshot when modal closes
            battleStateSnapshotRef.current = null
        }
    }, [isOpen, battleState])

    // Calculate results from SNAPSHOT (not live battleState)
    const results = useMemo(() => {
        const snapshot = battleStateSnapshotRef.current
        if (!snapshot || !isOpen) {
            console.log('[PVE Result] ⚠️ No snapshot or modal closed, returning null')
            return null
        }

        console.log('[PVE Result] 🧮 Calculating results from snapshot')

        const playerScore = snapshot.player1Score
        const aiScore = snapshot.player2Score
        const isWinner = playerScore > aiScore
        const totalQuestions = snapshot.questionList.length

        // Calculate wrong questions from answer records
        const wrongQuestionsRaw = (snapshot.answerRecords || [])
            .filter(record => !record.isCorrect)
            .map(record => {
                const question = snapshot.questionList.find(q => q.id === record.questionId)
                if (!question) return null

                const wrongQ: WrongQuestion = {
                    id: question.id,
                    questionText: question.question_text || question.questionText || '',
                    options: Array.isArray(question.options)
                        ? question.options.map(opt => typeof opt === 'string' ? opt : opt?.text || opt?.id || '')
                        : [],
                    correctAnswer: (question.correct_answer || question.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
                    userAnswer: record.userAnswer as 'A' | 'B' | 'C' | 'D' | null,
                    explanation: (question as any).explanation,
                    difficulty: question.difficulty,
                }

                return wrongQ
            })

        const wrongQuestions = wrongQuestionsRaw.filter((q): q is WrongQuestion => q !== null)

        const correctCount = totalQuestions - wrongQuestions.length
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

        // Calculate rewards based on performance
        const xpEarned = Math.round(playerScore / 10)
        const coinsEarned = isWinner ? 50 : 25

        console.log('[PVE Result] ✅ Results calculated:', {
            playerScore,
            aiScore,
            isWinner,
            correctCount,
            wrongCount: wrongQuestions.length,
            xpEarned,
            coinsEarned
        })

        return {
            playerScore,
            aiScore,
            isWinner,
            totalQuestions,
            correctCount,
            wrongCount: wrongQuestions.length,
            accuracy,
            wrongQuestions,
            xpEarned,
            coinsEarned,
        }
    }, [isOpen]) // Only depend on isOpen, not battleState

    const [showCelebration, setShowCelebration] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    useEffect(() => {
        if (isOpen && results?.isWinner) {
            setShowCelebration(true)
            const timer = setTimeout(() => setShowCelebration(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [isOpen, results?.isWinner])

    // Reset saved state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsSaved(false)
        }
    }, [isOpen])

    // Save all wrong questions to error book
    const saveToErrorBook = async () => {
        if (!results || results.wrongQuestions.length === 0 || isSaving || isSaved) return

        setIsSaving(true)

        try {
            let successCount = 0
            let failCount = 0
            const errors: Array<{ questionId: string; error: string }> = []

            // Save each wrong question
            for (const question of results.wrongQuestions) {
                try {
                    console.log('[PVE Error Book] Saving question:', { id: question.id, text: question.questionText.substring(0, 50) })

                    const response = await fetch('/api/error-book', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            questionId: question.id,
                            source: 'battle',
                        }),
                    })

                    if (response.ok) {
                        successCount++
                        console.log('[PVE Error Book] Successfully saved question:', question.id)
                    } else {
                        failCount++
                        const errorData = await response.json()
                        const errorMessage = errorData.message || errorData.error || 'Unknown error'
                        console.error(`[PVE Error Book] Failed to save question ${question.id}:`, errorData)
                        errors.push({ questionId: question.id, error: errorMessage })
                    }
                } catch (error) {
                    failCount++
                    const errorMessage = error instanceof Error ? error.message : 'Network error'
                    console.error(`[PVE Error Book] Error saving question ${question.id}:`, error)
                    errors.push({ questionId: question.id, error: errorMessage })
                }
            }

            if (successCount > 0) {
                setIsSaved(true)
                notify.success(`已儲存 ${successCount} 題到錯題本！`)
            }

            if (failCount > 0) {
                // Log detailed errors for debugging
                console.error('[PVE Error Book] Detailed errors:', errors)

                if (successCount === 0) {
                    // All failed - show more helpful message with first error
                    const firstError = errors[0]?.error || '未知錯誤'
                    if (firstError.includes('QUESTION_NOT_FOUND') || firstError.includes('同步')) {
                        notify.error('題目尚未同步到題庫，請稍後再試或聯繫客服')
                    } else if (firstError.includes('UNAUTHORIZED')) {
                        notify.error('請先登入後再儲存錯題')
                    } else {
                        notify.error(`儲存失敗：${firstError}`)
                    }
                } else {
                    // Partial failure
                    notify.warning(`${failCount} 題儲存失敗，${successCount} 題已成功儲存`)
                }
            }
        } catch (error) {
            console.error('[PVE Error Book] Unexpected error in saveToErrorBook:', error)
            notify.error('儲存失敗，請稍後再試')
        } finally {
            setIsSaving(false)
        }
    }

    if (!results) return null

    const { isWinner, playerScore, aiScore, totalQuestions, correctCount, wrongCount, accuracy, wrongQuestions, xpEarned, coinsEarned } = results

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90dvh] overflow-hidden p-0 bg-[#FAF6E9] border-2 border-[#E0D0B8]">
                {/* Celebration Overlay */}
                <AnimatePresence>
                    {showCelebration && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                        >
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: 'spring', duration: 0.6 }}
                                className="w-64 h-64"
                            >
                                <LottieAnimation
                                    animationPath="/assets/success.json"
                                    loop={false}
                                    autoplay={true}
                                    className="w-full h-full"
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Accessibility: Hidden title and description for screen readers */}
                <DialogTitle className="sr-only">
                    {isWinner ? 'PVE 對戰勝利' : 'PVE 對戰結束'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    你以 {playerScore} 比 {aiScore} {isWinner ? '擊敗' : '輸給'}了 AI，答對 {correctCount} 題，共 {totalQuestions} 題
                </DialogDescription>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-40 rounded-full bg-white/80 p-2 text-[#5D4037] hover:bg-white transition-colors"
                    aria-label="關閉"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[90dvh] px-6 py-8">
                    {/* Header: Result Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#FED168] to-[#E6C058] mb-4"
                        >
                            {isWinner ? (
                                <Trophy className="w-10 h-10 text-[#5D4037]" />
                            ) : (
                                <Target className="w-10 h-10 text-[#5D4037]" />
                            )}
                        </motion.div>

                        {/* Title */}
                        <h1 className="text-[32px] font-bold text-[#5D4037] mb-2 font-display">
                            {isWinner ? '🎉 太棒了！' : '💪 繼續加油！'}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-[16px] text-[#8B6F47] mb-6">
                            {isWinner
                                ? `你以 ${playerScore} : ${aiScore} 擊敗了 AI！`
                                : `雖然這次以 ${playerScore} : ${aiScore} 落後，但你已經很努力了`
                            }
                        </p>

                        {/* Stats Pills */}
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <div className="px-4 py-2 bg-[#E8F5E9] border-2 border-[#528555] rounded-full">
                                <span className="text-[14px] font-semibold text-[#528555]">
                                    ✓ {correctCount}/{totalQuestions} 答對
                                </span>
                            </div>
                            <div className="px-4 py-2 bg-[#FFFDF5] border-2 border-[#E0D0B8] rounded-full">
                                <span className="text-[14px] font-semibold text-[#5D4037]">
                                    {accuracy}% 正確率
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Rewards Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/60 rounded-2xl p-6 mb-8 border-2 border-[#E0D0B8]"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-[#FED168]" />
                            <h2 className="text-[18px] font-semibold text-[#5D4037]">獲得獎勵</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* XP */}
                            <div className="flex items-center gap-3 bg-[#F8F5E8] rounded-xl p-4 border border-[#E0D0B8]">
                                <div className="text-3xl">⭐</div>
                                <div>
                                    <p className="text-[12px] text-[#8B6F47]">經驗值</p>
                                    <p className="text-[20px] font-bold text-[#5D4037]">+{xpEarned}</p>
                                </div>
                            </div>

                            {/* Coins */}
                            <div className="flex items-center gap-3 bg-[#F8F5E8] rounded-xl p-4 border border-[#E0D0B8]">
                                <div className="text-3xl">🪙</div>
                                <div>
                                    <p className="text-[12px] text-[#8B6F47]">金幣</p>
                                    <p className="text-[20px] font-bold text-[#5D4037]">+{coinsEarned}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Wrong Questions Section */}
                    {wrongCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mb-8"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center">
                                    <X className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-[18px] font-semibold text-[#5D4037]">
                                    錯題回顧 ({wrongCount} 題)
                                </h2>
                            </div>

                            <p className="text-[14px] text-[#8B6F47] mb-6">
                                複習這些題目，下次就能答對了！
                            </p>

                            {/* Wrong Question Cards */}
                            <div className="space-y-4">
                                {wrongQuestions.map((question, index) => (
                                    <motion.div
                                        key={question.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="bg-[#FFFDF5] rounded-2xl p-6 border-2 border-[#E0D0B8] shadow-sm"
                                    >
                                        {/* Question Text */}
                                        <h3 className="text-[16px] font-medium text-[#5D4037] mb-4 leading-relaxed">
                                            {question.questionText}
                                        </h3>

                                        {/* Options */}
                                        <div className="space-y-2 mb-4">
                                            {(['A', 'B', 'C', 'D'] as const).map((label, optIndex) => {
                                                const isCorrect = label === question.correctAnswer
                                                const isUserAnswer = label === question.userAnswer

                                                return (
                                                    <div
                                                        key={label}
                                                        className={`px-4 py-3 rounded-xl border-2 transition-colors ${isCorrect
                                                            ? 'bg-[#E8F5E9] border-[#528555]'
                                                            : isUserAnswer
                                                                ? 'bg-[#FFEBEE] border-[#DC2626]'
                                                                : 'bg-[#F8F5E8] border-[#E0D0B8]'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-[14px] ${isCorrect ? 'text-[#5D4037] font-medium' : 'text-[#8B6F47]'}`}>
                                                                <span className={`font-semibold mr-2 ${isCorrect ? 'text-[#528555]' : 'text-[#FED168]'}`}>
                                                                    {label}.
                                                                </span>
                                                                {question.options[optIndex] || '選項載入中...'}
                                                            </span>
                                                            {isCorrect && <Check className="h-4 w-4 text-[#528555]" />}
                                                            {isUserAnswer && !isCorrect && <X className="h-4 w-4 text-[#DC2626]" />}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        {question.explanation && (
                                            <div className="mt-6 space-y-4">
                                                {/* Core Explanation */}
                                                <div className="bg-[#FFF8E1] rounded-xl p-5 border-l-4 border-[#FFB74D] shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Sparkles className="w-5 h-5 text-[#FFB74D]" />
                                                        <h4 className="text-[16px] font-bold text-[#5D4037]">詳細解析</h4>
                                                    </div>
                                                    <div className="prose prose-sm max-w-none text-[#795548] prose-headings:text-[#5D4037] prose-strong:text-[#E65100] prose-a:text-[#5B7CFF] prose-p:leading-relaxed prose-li:marker:text-[#FFB74D]">
                                                        <ReactMarkdown
                                                            components={{
                                                                p: (props) => <p className="mb-3 last:mb-0 leading-relaxed font-medium whitespace-pre-wrap" {...props} />,
                                                                ul: (props) => <ul className="list-disc pl-4 mb-3 space-y-1.5" {...props} />,
                                                                ol: (props) => <ol className="list-decimal pl-4 mb-3 space-y-1.5" {...props} />,
                                                                li: (props) => <li className="pl-1 leading-relaxed" {...props} />,
                                                                strong: (props) => <strong className="font-bold text-[#E65100]" {...props} />,
                                                                code: (props) => <code className="bg-[#FFECB3] px-1.5 py-0.5 rounded text-[#E65100] font-mono text-xs" {...props} />,
                                                                br: () => <br />,
                                                                // Custom heading rendering for better hierarchy
                                                                h1: (props) => <h1 className="text-lg font-bold text-[#5D4037] mt-4 mb-2" {...props} />,
                                                                h2: (props) => <h2 className="text-base font-bold text-[#5D4037] mt-3 mb-2" {...props} />,
                                                                h3: (props) => <h3 className="text-sm font-bold text-[#795548] mt-2 mb-1" {...props} />,
                                                            }}
                                                        >
                                                            {question.explanation}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* No Wrong Questions - Celebration */}
                    {wrongCount === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-gradient-to-br from-[#E8F5E9] to-[#F8F5E8] rounded-2xl p-8 mb-8 border-2 border-[#528555] text-center"
                        >
                            <div className="text-6xl mb-4">🎯</div>
                            <h3 className="text-[24px] font-bold text-[#528555] mb-2">完美表現！</h3>
                            <p className="text-[16px] text-[#5D4037]">你答對了所有題目！</p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-3"
                    >
                        {/* Save to Error Book Button - Only show if there are wrong questions */}
                        {wrongCount > 0 && (
                            <Button
                                onClick={saveToErrorBook}
                                disabled={isSaving || isSaved}
                                className="w-full h-14 bg-gradient-to-r from-[#F59E0B] to-[#EA580C] hover:from-[#D97706] hover:to-[#C2410C] text-white rounded-2xl text-[16px] font-bold shadow-lg transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isSaving ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"
                                        />
                                        儲存中...
                                    </>
                                ) : isSaved ? (
                                    <>
                                        <Check className="w-5 h-5 mr-2" />
                                        已儲存到錯題本
                                    </>
                                ) : (
                                    <>
                                        <Bookmark className="w-5 h-5 mr-2" />
                                        儲存錯題 ({wrongCount})
                                    </>
                                )}
                            </Button>
                        )}
                        {/* 🎯 Tutorial: Save Wrong Questions */}
                        <TutorialBubble
                            featureKey="pve_result_save_hint"
                            message={`錯題別灰心\n可以點擊「儲存錯題」加入錯題本喔！`}
                            position="relative"
                            trigger={isOpen && wrongCount > 0}
                            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max"
                        />

                        {/* Secondary Actions */}
                        <div className="flex gap-3">
                            <Button
                                onClick={onPlayAgain}
                                className="flex-1 h-14 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] rounded-2xl text-[16px] font-bold shadow-lg transition-all hover:scale-105"
                            >
                                <RotateCcw className="w-5 h-5 mr-2" />
                                再來一局
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="flex-1 h-14 bg-white hover:bg-[#F8F5E8] text-[#5D4037] border-2 border-[#E0D0B8] rounded-2xl text-[16px] font-bold transition-all"
                            >
                                返回大廳
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    )
})
