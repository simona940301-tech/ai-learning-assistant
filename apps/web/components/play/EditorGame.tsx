'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, Reorder, useDragControls, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertCircle, Sparkles, Trophy, ArrowRight } from 'lucide-react'

// ============================================
// Types & Data
// ============================================

interface GameOption {
    id: string
    text: string
    label: string // (A), (B), etc.
}

interface Blank {
    id: string
    number: number
    correctOptionId: string
}

// Hardcoded data for the prototype
const RAW_TEXT = `Manatees, also called sea cows, are large, slow-moving animals. They are {{21}} mammals because they can be found in waters and rivers, mostly in Florida of the United States. In {{22}} , manatees look like walruses, yet their closest relatives are elephants. Manatees have three or four tiny nails at the end of each flipper, very similar to an elephant's toenails. They also have prehensile upper lips, like elephants' trunks, to grasp and pull food into their mouths. Interestingly, manatees have to return to a freshwater river to drink while they enjoy swimming and grazing on seagrass in water.
In order to survive in tough and challenging conditions, manatees make a large quantity of special adaptations for breath. For example, they normally return to the {{23}} of the water about every two to five minutes but stay submerged for as long as 20 minutes if necessary. Manatees' lungs are quite long. The lungs extend horizontally along their backs. With each breath, manatees exchange 90 percent of the air in their lungs, while humans exchange 10 percent when they breathe.
Manatees' movements look {{24}} just like ballet dancers. Thus they were easily {{25}} for mermaids for ages. In spite of their graceful {{26}} , however, manatees have a very impolite way of sinking and swimming in the sea, making farts. Manatees use their farts to swim. An adult manatee will eat between 100 and 150 pounds of {{27}} each day, which means a lot of methane builds up inside.
Manatees are an {{28}} species. This is mainly due to their large size and slow movement in water that makes them {{29}} to hunters who attempt to collect their bones and oil. The number of manatees has {{30}} for the sake of hunting pressure. Despite law protections, threats are everywhere. The gentle beasts are often hit by motorboats, and sometimes become entangled in fishing nets. It is our duty to protect this beautiful creature with care.`

const OPTIONS: GameOption[] = [
    { id: 'opt-1', label: '(A)', text: 'characteristic' },
    { id: 'opt-2', label: '(B)', text: 'vegetation' },
    { id: 'opt-3', label: '(C)', text: 'declined' },
    { id: 'opt-4', label: '(D)', text: 'appearance' },
    { id: 'opt-5', label: '(E)', text: 'vulnerable' },
    { id: 'opt-6', label: '(F)', text: 'mistaken' },
    { id: 'opt-7', label: '(G)', text: 'elegant' },
    { id: 'opt-8', label: '(H)', text: 'aquatic' },
    { id: 'opt-9', label: '(I)', text: 'surface' },
    { id: 'opt-10', label: '(J)', text: 'endangered' },
]

const ANSWER_KEY: Record<number, string> = {
    21: 'opt-8', // aquatic
    22: 'opt-4', // appearance
    23: 'opt-9', // surface
    24: 'opt-7', // elegant
    25: 'opt-6', // mistaken
    26: 'opt-1', // characteristic (Best fit among leftovers, though debatable context)
    27: 'opt-2', // vegetation
    28: 'opt-10', // endangered
    29: 'opt-5', // vulnerable
    30: 'opt-3', // declined
}

// ============================================
// Components
// ============================================

function DraggableChip({ option, isUsed, onClick }: { option: GameOption, isUsed: boolean, onClick?: () => void }) {
    return (
        <motion.div
            layoutId={`chip-${option.id}`}
            initial={false}
            animate={{
                opacity: isUsed ? 0.5 : 1,
                scale: isUsed ? 0.9 : 1,
            }}
            whileHover={!isUsed ? { scale: 1.05, y: -2 } : {}}
            whileTap={!isUsed ? { scale: 0.95 } : {}}
            onClick={!isUsed ? onClick : undefined}
            className={cn(
                "cursor-grab active:cursor-grabbing select-none",
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors",
                isUsed
                    ? "border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                    : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-accent"
            )}
            draggable={!isUsed}
            onDragStart={(e: any) => {
                if (isUsed) {
                    e.preventDefault()
                    return
                }
                e.dataTransfer.setData('text/plain', option.id)
                e.dataTransfer.effectAllowed = 'copy'
            }}
        >
            <span className="font-bold text-primary">{option.label}</span>
            <span>{option.text}</span>
        </motion.div>
    )
}

function DropZone({
    number,
    filledOption,
    onDrop,
    onRemove,
    isCorrect,
    showValidation
}: {
    number: number
    filledOption: GameOption | null
    onDrop: (optionId: string) => void
    onRemove: () => void
    isCorrect?: boolean
    showValidation: boolean
}) {
    const [isOver, setIsOver] = useState(false)

    return (
        <span
            className={cn(
                "inline-flex align-middle mx-1 relative",
                "min-w-[80px] h-[28px] rounded-md border-b-2 transition-all duration-200",
                filledOption
                    ? "border-transparent"
                    : "border-muted-foreground/40 bg-muted/20",
                isOver && !filledOption && "bg-primary/10 border-primary scale-105",
                showValidation && filledOption && isCorrect && "text-green-600",
                showValidation && filledOption && !isCorrect && "text-red-500"
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

export function EditorGame({ onComplete }: { onComplete?: (score: number, total: number) => void }) {
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [showValidation, setShowValidation] = useState(false)
    const [startTime] = useState(Date.now())

    // Parse text into segments
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

    const handleDrop = (number: number, optionId: string) => {
        // If option is already used elsewhere, remove it from there
        const existingBlank = Object.entries(answers).find(([_, id]) => id === optionId)
        if (existingBlank) {
            const [blankNum] = existingBlank
            setAnswers(prev => {
                const next = { ...prev }
                delete next[parseInt(blankNum)]
                return next
            })
        }

        setAnswers(prev => ({ ...prev, [number]: optionId }))
    }

    const handleRemove = (number: number) => {
        setAnswers(prev => {
            const next = { ...prev }
            delete next[number]
            return next
        })
    }

    const checkAnswers = () => {
        setShowValidation(true)
        let correctCount = 0
        Object.entries(answers).forEach(([num, optId]) => {
            if (ANSWER_KEY[parseInt(num)] === optId) {
                correctCount++
            }
        })

        // Calculate score logic here if needed
        if (onComplete) {
            onComplete(correctCount, Object.keys(ANSWER_KEY).length)
        }
    }

    const isAllFilled = Object.keys(ANSWER_KEY).every(k => answers[parseInt(k)])
    const correctCount = Object.entries(answers).filter(([k, v]) => ANSWER_KEY[parseInt(k)] === v).length
    const totalCount = Object.keys(ANSWER_KEY).length

    return (
        <div className="flex flex-col h-full max-h-[80vh] gap-6">
            {/* Header Stats */}
            <div className="flex items-center justify-between px-1">
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span>實習編輯考核</span>
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

            {/* Main Content Area - Split View */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">

                {/* Left: Article Text */}
                <Card className="md:col-span-8 overflow-y-auto p-6 leading-loose text-lg font-serif bg-[#fdfbf7] text-slate-800 shadow-sm border-stone-200">
                    {segments.map((segment, i) => {
                        if (segment.type === 'text') {
                            return <span key={i}>{segment.content}</span>
                        } else {
                            const filledOptionId = answers[segment.number]
                            const filledOption = filledOptionId ? OPTIONS.find(o => o.id === filledOptionId) || null : null
                            const isCorrect = filledOptionId === ANSWER_KEY[segment.number]

                            return (
                                <DropZone
                                    key={i}
                                    number={segment.number}
                                    filledOption={filledOption}
                                    onDrop={(optId) => handleDrop(segment.number, optId)}
                                    onRemove={() => handleRemove(segment.number)}
                                    isCorrect={isCorrect}
                                    showValidation={showValidation}
                                />
                            )
                        }
                    })}
                </Card>

                {/* Right: Options Pool */}
                <div className="md:col-span-4 flex flex-col gap-4 min-h-0">
                    <div className="bg-muted/30 rounded-xl p-4 flex-1 overflow-y-auto border border-border/50">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            可用詞彙
                        </h3>
                        <div className="flex flex-wrap gap-2 content-start">
                            {OPTIONS.map(option => {
                                const isUsed = Object.values(answers).includes(option.id)
                                return (
                                    <DraggableChip
                                        key={option.id}
                                        option={option}
                                        isUsed={isUsed}
                                        onClick={() => {
                                            // Optional: Click to auto-fill first empty blank? 
                                            // For now, just drag.
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Action Button */}
                    {!showValidation ? (
                        <Button
                            className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                            disabled={!isAllFilled}
                            onClick={checkAnswers}
                        >
                            {isAllFilled ? '提交審核' : '請填寫所有空格'}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full h-12 text-lg"
                            onClick={() => {
                                // Reset or Close?
                                // For this demo, maybe just show score is enough
                            }}
                        >
                            考核結束
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
