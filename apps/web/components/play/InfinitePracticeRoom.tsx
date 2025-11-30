'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, Share2, Users, ArrowLeft, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

interface InfinitePracticeRoomProps {
    roomCode: string
}

export function InfinitePracticeRoom({ roomCode }: InfinitePracticeRoomProps) {
    const router = useRouter()
    const [questions, setQuestions] = useState<Question[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [participants, setParticipants] = useState<any[]>([])
    const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null)
    const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null)
    const [roomId, setRoomId] = useState<string | null>(null)
    const supabase = supabaseBrowserClient

    // Initial load
    useEffect(() => {
        fetchQuestions(0)
        setupRealtimeSubscription()
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
        const { data } = await supabase
            .from('practice_participants')
            .select('user_id, current_question_index, correct_count')
            .eq('room_id', roomId)

        if (data) setParticipants(data)
    }

    const handleAnswer = async (questionId: string, option: string, isCorrect: boolean) => {
        if (answers[questionId]) return

        setAnswers(prev => ({ ...prev, [questionId]: option }))

        // Update progress in database
        if (roomId) {
            const index = questions.findIndex(q => q.id === questionId)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Get current progress
                    const { data: current } = await supabase
                        .from('practice_participants')
                        .select('correct_count')
                        .eq('room_id', roomId)
                        .eq('user_id', user.id)
                        .single()

                    // Update with new values
                    await supabase
                        .from('practice_participants')
                        .update({
                            current_question_index: index + 1,
                            correct_count: (current?.correct_count || 0) + (isCorrect ? 1 : 0),
                            last_active_at: new Date().toISOString()
                        })
                        .eq('room_id', roomId)
                        .eq('user_id', user.id)
                }
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

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-black/50 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push('/play')}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        退出
                    </Button>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono text-white/60">ROOM: {roomCode}</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Users className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white">{participants.length}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="rounded-full w-10 h-10 p-0">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

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
        </div>
    )
}
