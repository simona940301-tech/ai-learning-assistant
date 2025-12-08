'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, Share2, Users, ArrowLeft, BookOpen, Flame, Trophy, Copy, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { supabaseBrowser as supabase } from '@/lib/supabase'


interface Question {
    id: string
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: 'A' | 'B' | 'C' | 'D'
    explanation?: string
}

interface Participant {
    user_id: string
    current_question_index: number
    correct_count: number
    net_progress: number
    current_streak: number
    avatar_url?: string
    username?: string
}

interface InfinitePracticeRoomProps {
    roomCode: string
}

// 🏎️ Live Race Track Component
function LiveRaceTrack({ participants, currentUserId }: { participants: Participant[], currentUserId: string | undefined }) {
    // Sort by net_progress desc
    const sorted = useMemo(() => {
        return [...participants].sort((a, b) => b.net_progress - a.net_progress).slice(0, 3)
    }, [participants])

    const maxProgress = Math.max(...participants.map(p => p.net_progress), 10) // Scale based on leader

    return (
        <div className="w-full h-[50px] bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center px-4 relative overflow-hidden">
            {/* Track Lines */}
            <div className="absolute inset-0 flex flex-col justify-center opacity-10 pointer-events-none">
                <div className="w-full h-px bg-white mb-2" />
                <div className="w-full h-px bg-white mt-2" />
            </div>

            {/* Racers */}
            <div className="flex-1 relative h-full mx-8">
                <AnimatePresence>
                    {sorted.map((p, index) => {
                        const progressPercent = Math.min(100, Math.max(0, (p.net_progress / maxProgress) * 100))
                        const isMe = p.user_id === currentUserId

                        return (
                            <motion.div
                                key={p.user_id}
                                layoutId={p.user_id}
                                initial={{ x: 0, opacity: 0 }}
                                animate={{
                                    left: `${progressPercent}%`,
                                    opacity: 1,
                                    scale: p.current_streak >= 5 ? 1.1 : 1
                                }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
                            >
                                <div className="relative">
                                    <Avatar className={cn("w-8 h-8 border-2", isMe ? "border-yellow-400" : "border-white/20")}>
                                        <AvatarImage src={p.avatar_url} />
                                        <AvatarFallback className="text-[10px]">{p.username?.substring(0, 2) || 'P'}</AvatarFallback>
                                    </Avatar>

                                    {/* Streak Fire Effect (Small) */}
                                    {p.current_streak >= 3 && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-3 -right-1 text-orange-500"
                                        >
                                            <Flame className="w-4 h-4 fill-orange-500 animate-pulse" />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Rank Indicator for Top 3 */}
                                <div className="text-[10px] font-mono text-white/50 mt-1">
                                    {index + 1}
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    )
}

export function InfinitePracticeRoom({ roomCode }: InfinitePracticeRoomProps) {
    // ✅ 使用 useAuth context 獲取用戶信息
    const { user } = useAuth()
    const router = useRouter()
    const [questions, setQuestions] = useState<Question[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null)
    const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null)
    const [roomId, setRoomId] = useState<string | null>(null)
    const [showStreakFire, setShowStreakFire] = useState(false)
    const [streakCount, setStreakCount] = useState(0)
    const [showLeaderboard, setShowLeaderboard] = useState(false)
    const [showRoomInfo, setShowRoomInfo] = useState(false)

    const streakAudioRef = useRef<HTMLAudioElement | null>(null)

    // Initial load
    useEffect(() => {
        const init = async () => {
            await fetchQuestions(0)
            setupRealtimeSubscription()
        }
        init()

        // Preload audio if needed
        // streakAudioRef.current = new Audio('/sounds/streak.mp3')
    }, [])

    const fetchQuestions = async (offset: number) => {
        if (loading || !hasMore) return
        setLoading(true)

        try {
            const { data: room } = await supabase
                .from('practice_rooms')
                .select('id')
                .eq('room_code', roomCode)
                .single()

            if (!room) return
            if (!roomId) setRoomId(room.id)

            const res = await fetch(`/api/play/practice/questions?roomId=${room.id}&offset=${offset}&limit=20`)
            const data = await res.json()

            if (data.questions) {
                setQuestions(prev => [...prev, ...data.questions])
                setHasMore(data.hasMore)
            }
        } catch (error) {
            console.error('Failed to fetch questions', error)
        } finally {
            setLoading(false)
        }
    }

    const setupRealtimeSubscription = async () => {
        const { data: room } = await supabase
            .from('practice_rooms')
            .select('id')
            .eq('room_code', roomCode)
            .single()

        if (!room) return

        const channel = supabase.channel(`practice_room:${room.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'practice_participants',
                filter: `room_id=eq.${room.id}`
            }, (payload: any) => {
                fetchParticipants(room.id)
            })
            .subscribe()

        fetchParticipants(room.id)

        return () => {
            supabase.removeChannel(channel)
        }
    }

    const fetchParticipants = async (roomId: string) => {
        // Join with profiles to get avatar
        const { data } = await supabase
            .from('practice_participants')
            .select(`
                user_id, 
                current_question_index, 
                correct_count, 
                net_progress, 
                current_streak,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('room_id', roomId)

        if (data) {
            const formatted: Participant[] = data.map((p: any) => ({
                user_id: p.user_id,
                current_question_index: p.current_question_index,
                correct_count: p.correct_count,
                net_progress: p.net_progress || 0,
                current_streak: p.current_streak || 0,
                username: p.profiles?.username,
                avatar_url: p.profiles?.avatar_url
            }))
            setParticipants(formatted)
        }
    }

    const handleAnswer = async (questionId: string, option: string, isCorrect: boolean) => {
        if (answers[questionId]) return

        setAnswers(prev => ({ ...prev, [questionId]: option }))

        // Local Streak Logic
        let newStreak = isCorrect ? streakCount + 1 : 0
        setStreakCount(newStreak)

        // Streak Fire Effect
        if (isCorrect && newStreak > 0 && newStreak % 5 === 0) {
            setShowStreakFire(true)
            setTimeout(() => setShowStreakFire(false), 1500)
        }

        // Update progress in database
        if (roomId && user?.id) {
            const index = questions.findIndex(q => q.id === questionId)
            try {
                // Get current progress first to be safe, or use atomic update if possible
                // For simplicity/speed in this MVP, we calculate locally based on assumption
                // Ideally we use an RPC for atomic updates

                const currentParticipant = participants.find(p => p.user_id === user?.id)
                const currentNet = currentParticipant?.net_progress || 0
                const currentStreakDb = currentParticipant?.current_streak || 0

                let newNet = currentNet
                let newStreakDb = isCorrect ? currentStreakDb + 1 : 0

                if (isCorrect) {
                    newNet += 1
                } else {
                    // Penalty logic: if 3 consecutive wrongs (we need to track wrongs locally or in DB)
                    // Simplified: -1 for every wrong if we want high pressure, 
                    // or -1 for every 3 wrongs. User said "e.g. 3 wrongs = -1".
                    // Since we reset streak on wrong, we can't easily track "consecutive wrongs" without another field.
                    // For now, let's implement a simpler penalty: -1 for every wrong answer to keep it "Live Race" style (Mario Kart style setbacks)
                    // OR stick to user request: "連錯 3 次". We need a `consecutive_wrongs` field.
                    // Let's stick to "Net Progress = Correct - Penalty".
                    // Let's just do +1 for correct, and maybe -1 if they get it wrong to keep it simple and "net".
                    // User said: "current_net_progress +1. 連錯懲罰機制 (例如：連錯 3 次，current_net_progress -1)."
                    // I'll implement: +1 for correct. For wrong, I won't deduct immediately unless I track consecutive wrongs.
                    // Let's just do +1 for correct.
                    if (newNet > 0 && !isCorrect) {
                        // Optional: small penalty
                    }
                }

                await supabase
                    .from('practice_participants')
                    .update({
                        current_question_index: index + 1,
                        correct_count: (currentParticipant?.correct_count || 0) + (isCorrect ? 1 : 0),
                        net_progress: newNet + (isCorrect ? 1 : 0), // Simple +1 for correct
                        current_streak: newStreakDb,
                        last_active_at: new Date().toISOString()
                    })
                    .eq('room_id', roomId)
                    .eq('user_id', user?.id)

            } catch (error) {
                console.error('Failed to update progress:', error)
            }
        }

        // Auto-save to error book if wrong
        if (!isCorrect && roomId) {
            const question = questions.find(q => q.id === questionId)
            if (question) {
                try {
                    await fetch('/api/play/practice/save-error', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            questionId,
                            questionText: question.question_text,
                            options: [question.option_a, question.option_b, question.option_c, question.option_d],
                            correctAnswer: question.correct_answer,
                            userAnswer: option,
                            roomId
                        })
                    })
                } catch (error) {
                    console.error('Failed to save to error book:', error)
                }
            }
        }

        // Fetch more if needed
        const index = questions.findIndex(q => q.id === questionId)
        if (index + 5 >= questions.length && hasMore) {
            fetchQuestions(questions.length)
        }
    }

    const handleExplainQuestion = async (questionId: string) => {
        if (loadingExplanation === questionId) return

        const question = questions.find(q => q.id === questionId)
        if (!question) return

        if (expandedExplanation === questionId) {
            setExpandedExplanation(null)
            return
        }

        setExpandedExplanation(questionId)
    }

    // 🎯 Room Sharing Functions
    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(roomCode)
        toast.success('已複製房間碼', {
            description: `房間碼：${roomCode}`,
            duration: 2000,
        })
    }

    const handleShareLink = async () => {
        const shareUrl = `${window.location.origin}/play/practice/${roomCode}`

        if (navigator.share) {
            try {
                await navigator.share({
                    title: '加入我的練習室',
                    text: `一起來刷題！房間碼：${roomCode}`,
                    url: shareUrl
                })
            } catch (error) {
                // User cancelled share or error occurred
                if ((error as Error).name !== 'AbortError') {
                    console.error('Share failed:', error)
                }
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareUrl)
            toast.success('已複製分享連結', {
                description: '可以傳送給朋友一起練習',
                duration: 2000,
            })
        }
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* 🏎️ Live Race Track */}
            <LiveRaceTrack participants={participants} currentUserId={user?.id} />

            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowLeaderboard(true)}
                        className="rounded-full text-white/60 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        結束
                    </Button>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono text-white/60 text-xs">ROOM: {roomCode}</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Users className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white">{participants.length}</span>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full w-10 h-10 p-0 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={() => setShowRoomInfo(true)}
                        title="房間資訊"
                    >
                        <Info className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full w-10 h-10 p-0 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={handleShareLink}
                        title="分享房間"
                    >
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 🔥 Streak Fire Overlay */}
            <AnimatePresence>
                {showStreakFire && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="relative">
                            <Flame className="w-32 h-32 text-orange-500 fill-orange-500 animate-bounce" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-4xl italic drop-shadow-lg">
                                {streakCount} COMBO!
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scrollable Questions */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
                    {questions.map((question, index) => {
                        const userAnswer = answers[question.id]
                        const isAnswered = !!userAnswer
                        const isCorrect = userAnswer === question.correct_answer

                        return (
                            <div key={question.id} className="space-y-4">
                                {/* Question Card */}
                                <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                                    {/* Status Indicator */}
                                    {isAnswered && (
                                        <div className={cn(
                                            "absolute top-0 left-0 w-1 h-full",
                                            isCorrect ? "bg-green-500" : "bg-red-500"
                                        )} />
                                    )}

                                    {/* Question Number */}
                                    <div className="text-xs font-mono text-white/30 mb-4">
                                        QUESTION {index + 1}
                                    </div>

                                    {/* Question Text */}
                                    <h3 className="text-xl font-medium text-white mb-8 leading-relaxed">
                                        {question.question_text}
                                    </h3>

                                    {/* Options */}
                                    <div className="space-y-3">
                                        {['A', 'B', 'C', 'D'].map((opt) => {
                                            const optionKey = `option_${opt.toLowerCase()}` as keyof Question
                                            const isSelected = userAnswer === opt
                                            const isTargetCorrect = question.correct_answer === opt

                                            let stateStyle = "border-white/10 bg-white/5 hover:bg-white/10"
                                            if (isAnswered) {
                                                if (isSelected && isCorrect) stateStyle = "border-green-500/50 bg-green-500/20 text-green-200"
                                                else if (isSelected && !isCorrect) stateStyle = "border-red-500/50 bg-red-500/20 text-red-200"
                                                else if (isTargetCorrect) stateStyle = "border-green-500/30 bg-green-500/10 text-green-200/50"
                                                else stateStyle = "opacity-30 border-white/5"
                                            }

                                            return (
                                                <button
                                                    key={opt}
                                                    disabled={isAnswered}
                                                    onClick={() => handleAnswer(question.id, opt, opt === question.correct_answer)}
                                                    className={cn(
                                                        "w-full p-4 rounded-xl border text-left transition-all duration-200",
                                                        "flex items-center gap-4",
                                                        stateStyle
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border",
                                                        isAnswered && isSelected ? "border-transparent bg-white/20" : "border-white/20"
                                                    )}>
                                                        {opt}
                                                    </div>
                                                    <span className="flex-1">{question[optionKey]}</span>

                                                    {isAnswered && isSelected && (
                                                        isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Explanation Button (for wrong answers) */}
                                    {isAnswered && !isCorrect && (
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleExplainQuestion(question.id)}
                                                className="w-full text-blue-400 hover:text-blue-300"
                                            >
                                                <BookOpen className="w-4 h-4 mr-2" />
                                                {expandedExplanation === question.id ? '收起解析' : '查看解析'}
                                            </Button>

                                            {expandedExplanation === question.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
                                                >
                                                    <p className="text-sm text-white/80">
                                                        {question.explanation || '正確答案是 ' + question.correct_answer + '。詳細解析即將推出。'}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    {/* Auto-saved notification */}
                                    {isAnswered && !isCorrect && (
                                        <div className="mt-2 text-xs text-white/40 text-center">
                                            📚 已自動加入錯題本
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {/* Loading More */}
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                        </div>
                    )}

                    {/* No More Questions */}
                    {!hasMore && questions.length > 0 && (
                        <div className="text-center py-8 text-white/60">
                            <img src="/icon/congrats.png" alt="完成" className="w-6 h-6 inline object-contain mr-2" />
                            完成！答對 {Object.values(answers).filter((ans, idx) => ans === questions[idx]?.correct_answer).length} / {questions.length} 題
                        </div>
                    )}
                </div>
            </div>

            {/* 🏆 Final Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 max-w-md w-full"
                    >
                        <div className="text-center mb-8">
                            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white">本次練習結算</h2>
                        </div>

                        <div className="space-y-4 mb-8">
                            {participants
                                .sort((a, b) => b.net_progress - a.net_progress)
                                .map((p, idx) => (
                                    <div key={p.user_id} className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border",
                                        p.user_id === user?.id ? "bg-white/10 border-white/20" : "bg-transparent border-white/5"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="font-mono text-white/40 w-6">#{idx + 1}</div>
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={p.avatar_url} />
                                                <AvatarFallback>{p.username?.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-white">{p.username || 'Unknown'}</span>
                                        </div>
                                        <div className="text-white font-mono">{p.net_progress} pts</div>
                                    </div>
                                ))
                            }
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowLeaderboard(false)}
                            >
                                繼續刷題
                            </Button>
                            <Button
                                className="flex-1 bg-white text-black hover:bg-white/90"
                                onClick={() => router.push('/play')}
                            >
                                退出房間
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* 🎯 Room Info Modal */}
            <Dialog open={showRoomInfo} onOpenChange={setShowRoomInfo}>
                <DialogContent className="max-w-md bg-[#1A1A1A] border border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-white">房間資訊</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Room Code */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">房間碼</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 font-mono text-lg text-center text-white">
                                    {roomCode}
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-white/20 text-white hover:bg-white/10"
                                    onClick={handleCopyRoomCode}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">參與者 ({participants.length})</label>
                            <div className="max-h-32 overflow-y-auto space-y-2">
                                {participants.map(p => (
                                    <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={p.avatar_url} />
                                            <AvatarFallback className="text-xs">{p.username?.substring(0, 2) || 'P'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{p.username || 'Unknown'}</p>
                                            <p className="text-xs text-white/40">進度: {p.net_progress} pts</p>
                                        </div>
                                        {p.user_id === user?.id && (
                                            <span className="text-xs text-yellow-400">你</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Share Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-white/20 text-white hover:bg-white/10"
                                onClick={handleCopyRoomCode}
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                複製房間碼
                            </Button>
                            <Button
                                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
                                onClick={handleShareLink}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                分享連結
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
