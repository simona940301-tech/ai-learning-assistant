'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Trophy, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { useEditorStore, ChipData } from '@/store/editorStore'
import { Chip } from '@/components/game/Chip'

// ============================================
// Mock Data (Enhanced)
// ============================================

const RAW_TEXT = `Manatees, also called sea cows, are large, slow-moving animals. They are {{21}} mammals because they can be found in waters and rivers, mostly in Florida of the United States. In {{22}} , manatees look like walruses, yet their closest relatives are elephants. Manatees have three or four tiny nails at the end of each flipper, very similar to an elephant's toenails. They also have prehensile upper lips, like elephants' trunks, to grasp and pull food into their mouths. Interestingly, manatees have to return to a freshwater river to drink while they enjoy swimming and grazing on seagrass in water.
In order to survive in tough and challenging conditions, manatees make a large quantity of special adaptations for breath. For example, they normally return to the {{23}} of the water about every two to five minutes but stay submerged for as long as 20 minutes if necessary. Manatees' lungs are quite long. The lungs extend horizontally along their backs. With each breath, manatees exchange 90 percent of the air in their lungs, while humans exchange 10 percent when they breathe.
Manatees' movements look {{24}} just like ballet dancers. Thus they were easily {{25}} for mermaids for ages. In spite of their graceful {{26}} , however, manatees have a very impolite way of sinking and swimming in the sea, making farts. Manatees use their farts to swim. An adult manatee will eat between 100 and 150 pounds of {{27}} each day, which means a lot of methane builds up inside.
Manatees are an {{28}} species. This is mainly due to their large size and slow movement in water that makes them {{29}} to hunters who attempt to collect their bones and oil. The number of manatees has {{30}} for the sake of hunting pressure. Despite law protections, threats are everywhere. The gentle beasts are often hit by motorboats, and sometimes become entangled in fishing nets. It is our duty to protect this beautiful creature with care.`

const MOCK_CHIPS: ChipData[] = [
    { id: 'opt-1', label: '(A)', text: 'characteristic', interferenceLevel: 'High', distractorTag: 'Grammar_Mismatch' },
    { id: 'opt-2', label: '(B)', text: 'vegetation', interferenceLevel: 'Low' }, // Correct for 27
    { id: 'opt-3', label: '(C)', text: 'declined', interferenceLevel: 'Low' }, // Correct for 30
    { id: 'opt-4', label: '(D)', text: 'appearance', interferenceLevel: 'High' }, // Correct for 22
    { id: 'opt-5', label: '(E)', text: 'vulnerable', interferenceLevel: 'Low' }, // Correct for 29
    { id: 'opt-6', label: '(F)', text: 'mistaken', interferenceLevel: 'High' }, // Correct for 25
    { id: 'opt-7', label: '(G)', text: 'elegant', interferenceLevel: 'Low' }, // Correct for 24
    { id: 'opt-8', label: '(H)', text: 'aquatic', interferenceLevel: 'High' }, // Correct for 21
    { id: 'opt-9', label: '(I)', text: 'surface', interferenceLevel: 'Low' }, // Correct for 23
    { id: 'opt-10', label: '(J)', text: 'endangered', interferenceLevel: 'High' }, // Correct for 28
]

const ANSWER_KEY: Record<number, string> = {
    21: 'opt-8',
    22: 'opt-4',
    23: 'opt-9',
    24: 'opt-7',
    25: 'opt-6',
    26: 'opt-1',
    27: 'opt-2',
    28: 'opt-10',
    29: 'opt-5',
    30: 'opt-3',
}

// ============================================
// Sub-Components
// ============================================

function DropZone({
    number,
    filledOption,
    onDrop,
    onRemove,
    isCorrect,
    showValidation,
    onEnterViewport
}: {
    number: number
    filledOption: ChipData | null
    onDrop: (optionId: string) => void
    onRemove: () => void
    isCorrect?: boolean
    showValidation: boolean
    onEnterViewport: () => void
}) {
    const [isOver, setIsOver] = useState(false)

    // Simple viewport check (could be improved with IntersectionObserver)
    useEffect(() => {
        onEnterViewport()
    }, [])

    return (
        <span
            className={cn(
                "inline-flex align-middle mx-1.5 relative transition-all duration-300",
                "min-w-[80px] h-[32px] rounded-lg",
                filledOption
                    ? "bg-transparent"
                    : "bg-muted/10 border-b-2 border-muted-foreground/20",
                isOver && !filledOption && "bg-primary/5 border-primary/50 scale-105",
                showValidation && filledOption && isCorrect && "text-emerald-600",
                showValidation && filledOption && !isCorrect && "text-rose-500"
            )}
            onDragOver={(e) => {
                e.preventDefault()
                if (!filledOption) setIsOver(true)
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => {
                e.preventDefault()
                setIsOver(false)
                const optionId = e.dataTransfer.getData('text/plain')
                if (optionId) onDrop(optionId)
            }}
        >
            {filledOption ? (
                <motion.span
                    layoutId={`filled-${number}-${filledOption.id}`}
                    className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium cursor-pointer",
                        "bg-primary/10 hover:bg-red-500/10 hover:text-red-600 transition-colors",
                        showValidation && isCorrect && "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700 cursor-default",
                        showValidation && !isCorrect && "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700 cursor-default"
                    )}
                    onClick={() => {
                        if (!showValidation) onRemove()
                    }}
                >
                    {filledOption.text}
                    {showValidation && (
                        isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />
                    )}
                </motion.span>
            ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground/50 pointer-events-none">
                    {number}
                </span>
            )}
        </span>
    )
}

// ============================================
// Main Component
// ============================================

export function EditorGame({ onComplete }: { onComplete?: (score: number, total: number) => void }) {
    const {
        blanks,
        chips,
        removedChips,
        initializeGame,
        handleChipDrop,
        handleSwipeAway,
        handleRemoveFromBlank,
        recordBlankEntry,
        telemetry,
        setSessionId: setStoreSessionId,
        getEvents
    } = useEditorStore()

    const [showValidation, setShowValidation] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [startTime, setStartTime] = useState<number>(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [progressionResult, setProgressionResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Initialize game and start session
    useEffect(() => {
        const blankIds = Object.keys(ANSWER_KEY).map(Number)
        initializeGame(MOCK_CHIPS, blankIds)
        setStartTime(Date.now())

        // Start session
        startSession()
    }, [])

    const startSession = async () => {
        try {
            const response = await fetch('/api/play/editor/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    difficulty: 'medium',
                    metadata: { questionCount: Object.keys(ANSWER_KEY).length }
                })
            })

            if (!response.ok) {
                throw new Error('Failed to start session')
            }

            const data = await response.json()
            setSessionId(data.sessionId)
            setStoreSessionId(data.sessionId)
            console.log('[EditorGame] Session started:', data.sessionId)
        } catch (err) {
            console.error('[EditorGame] Failed to start session:', err)
            setError('無法啟動遊戲會話')
        }
    }

    // Parse text
    const segments = useMemo(() => {
        const parts = RAW_TEXT.split(/(\{\{\d+\}\})/)
        return parts.map((part, index) => {
            const match = part.match(/\{\{(\d+)\}\}/)
            if (match) {
                return { type: 'blank', number: parseInt(match[1], 10) } as const
            }
            return { type: 'text', content: part } as const
        })
    }, [])

    const checkAnswers = async () => {
        if (!sessionId) {
            setError('遊戲會話未初始化')
            return
        }

        setShowValidation(true)
        setIsSubmitting(true)
        setError(null)

        let correctCount = 0
        Object.entries(blanks).forEach(([num, optId]) => {
            if (ANSWER_KEY[parseInt(num)] === optId) {
                correctCount++
            }
        })

        const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000)

        // Get events from store (Phase A-1)
        const events = getEvents()

        // Generate telemetry summary from events
        const eventSummary = {
            totalEvents: events.length,
            eventsByType: events.reduce((acc, e) => {
                acc[e.eventType] = (acc[e.eventType] || 0) + 1
                return acc
            }, {} as Record<string, number>),
            sessionDuration: timeSpentSeconds * 1000
        }

        try {
            const response = await fetch('/api/play/editor/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    score: correctCount,
                    totalPossible: Object.keys(ANSWER_KEY).length,
                    timeSpentSeconds,
                    telemetry: {
                        blanks,
                        blankAttempts: telemetry,
                        // Phase A-1: Add event summary
                        eventSummary,
                        events: events.map(e => ({
                            type: e.eventType,
                            payload: e.payload,
                            timestamp: e.timestamp
                        }))
                    }
                })
            })

            if (!response.ok) {
                throw new Error('Failed to submit session')
            }

            const data = await response.json()
            setProgressionResult(data.progression)
            console.log('[EditorGame] Session submitted:', data)

            if (onComplete) {
                onComplete(correctCount, Object.keys(ANSWER_KEY).length)
            }
        } catch (err) {
            console.error('[EditorGame] Failed to submit session:', err)
            setError('提交失敗，請稍後再試')
        } finally {
            setIsSubmitting(false)
        }
    }

    const isAllFilled = Object.keys(ANSWER_KEY).every(k => blanks[parseInt(k)])
    const correctCount = Object.entries(blanks).filter(([k, v]) => ANSWER_KEY[parseInt(k)] === v).length
    const totalCount = Object.keys(ANSWER_KEY).length

    return (
        <div className="flex flex-col h-full max-h-[80vh] gap-6">
            {/* Header Stats */}
            <div className="flex items-center justify-between px-1">
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span>實習編輯考核 (v0.1)</span>
                    </div>
                </div>
                {showValidation && (
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span className={cn(correctCount === totalCount ? "text-green-600" : "text-orange-500")}>
                            {correctCount} / {totalCount} 正確
                        </span>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">

                {/* Left: Article Text */}
                <Card className="md:col-span-8 overflow-y-auto p-8 leading-loose text-lg font-serif bg-background/50 backdrop-blur-sm border-none shadow-none">
                    {segments.map((segment, i) => {
                        if (segment.type === 'text') {
                            return <span key={i} className="text-foreground/80">{segment.content}</span>
                        } else {
                            const filledOptionId = blanks[segment.number]
                            const filledOption = filledOptionId ? chips.find(o => o.id === filledOptionId) || null : null
                            const isCorrect = filledOptionId === ANSWER_KEY[segment.number]

                            return (
                                <DropZone
                                    key={i}
                                    number={segment.number}
                                    filledOption={filledOption}
                                    onDrop={(optId) => handleChipDrop(optId, segment.number)}
                                    onRemove={() => handleRemoveFromBlank(segment.number)}
                                    isCorrect={isCorrect}
                                    showValidation={showValidation}
                                    onEnterViewport={() => recordBlankEntry(segment.number.toString())}
                                />
                            )
                        }
                    })}
                </Card>

                {/* Right: Options Pool */}
                <div className="md:col-span-4 flex flex-col gap-6 min-h-0 py-4">
                    <div className="flex-1 overflow-y-auto px-1">
                        <h3 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Vocabulary Pool
                        </h3>
                        <div className="flex flex-wrap gap-3 content-start">
                            <AnimatePresence>
                                {chips.map(option => {
                                    const isUsed = Object.values(blanks).includes(option.id)
                                    const isRemoved = removedChips.includes(option.id)

                                    if (isRemoved) return null

                                    return (
                                        <Chip
                                            key={option.id}
                                            data={option}
                                            isUsed={isUsed}
                                            onDragStart={() => { }}
                                            onSwipeAway={() => handleSwipeAway(option.id)}
                                        />
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Action Button */}
                    {error && (
                        <div className="text-sm text-red-500 text-center mb-2">
                            {error}
                        </div>
                    )}
                    {!showValidation ? (
                        <Button
                            className="w-full h-14 text-base font-medium rounded-full shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={!isAllFilled || isSubmitting || !sessionId}
                            onClick={checkAnswers}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    提交中...
                                </>
                            ) : isAllFilled ? (
                                <>
                                    Submit for Review
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            ) : (
                                'Fill all blanks'
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            {progressionResult && (
                                <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">XP 獲得</span>
                                            <span className="text-2xl font-bold text-emerald-600">+{progressionResult.xpGained}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">金幣獲得</span>
                                            <span className="text-xl font-bold text-yellow-600">+{progressionResult.coinsGained}</span>
                                        </div>
                                        {progressionResult.leveledUp && (
                                            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                                    <Trophy className="w-5 h-5" />
                                                    <span>升級到 Level {progressionResult.newLevel}!</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )}
                            <Button
                                variant="secondary"
                                className="w-full h-14 text-base rounded-full"
                                onClick={() => {
                                    window.location.reload()
                                }}
                            >
                                再玩一次
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
