'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Trophy, ArrowRight, Sparkles } from 'lucide-react'
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
        telemetry
    } = useEditorStore()

    const [showValidation, setShowValidation] = useState(false)

    // Initialize
    useEffect(() => {
        const blankIds = Object.keys(ANSWER_KEY).map(Number)
        initializeGame(MOCK_CHIPS, blankIds)
    }, [])

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

    const checkAnswers = () => {
        setShowValidation(true)
        let correctCount = 0
        Object.entries(blanks).forEach(([num, optId]) => {
            if (ANSWER_KEY[parseInt(num)] === optId) {
                correctCount++
            }
        })

        // Log Telemetry to Console (for verification)
        console.log('[EditorGame] Telemetry Data:', telemetry)

        if (onComplete) {
            onComplete(correctCount, Object.keys(ANSWER_KEY).length)
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
                    {!showValidation ? (
                        <Button
                            className="w-full h-14 text-base font-medium rounded-full shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={!isAllFilled}
                            onClick={checkAnswers}
                        >
                            {isAllFilled ? 'Submit for Review' : 'Fill all blanks'}
                            {isAllFilled && <ArrowRight className="w-4 h-4 ml-2" />}
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            className="w-full h-14 text-base rounded-full"
                            onClick={() => {
                                // Reset or Close
                            }}
                        >
                            Assessment Complete
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
