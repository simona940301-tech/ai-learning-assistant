'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SubjectSelect } from '@/components/ui/subject-select'
import { Book, Sparkles, Target, Shuffle, Loader2, Store } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { handleApiError } from '@/lib/error-handler'

interface QuestionSet {
    id: string
    title: string
    description: string
    subject: string
    difficulty_level: number
    rating: number
    practice_count: number
    progress_data?: {
        total: number
        completed: number
        correct_rate: number
    }
}

interface PracticeSourceModalProps {
    isOpen: boolean
    onClose: () => void
}

type SourceType = 'MIXED' | 'QUESTION_SET' | 'ERROR_BOOK' | 'SUBJECT_TAG'

export function PracticeSourceModal({ isOpen, onClose }: PracticeSourceModalProps) {
    const router = useRouter()
    const [sourceType, setSourceType] = useState<SourceType>('MIXED')
    const [selectedSubject, setSelectedSubject] = useState<string>('')
    const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null)
    const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
    const [isLoadingQuestionSets, setIsLoadingQuestionSets] = useState(false)
    const [isCreatingRoom, setIsCreatingRoom] = useState(false)

    // Load question sets when modal opens
    useEffect(() => {
        if (isOpen && sourceType === 'QUESTION_SET') {
            loadQuestionSets()
        }
    }, [isOpen, sourceType])

    const loadQuestionSets = async () => {
        setIsLoadingQuestionSets(true)
        try {
            const response = await fetch('/api/user/question-sets', {
                credentials: 'include',
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to load question sets')
            }

            setQuestionSets(data.sets || [])
        } catch (error) {
            console.error('Failed to load question sets:', error)
            handleApiError(error, 'Load Question Sets', {
                title: '載入失敗',
                description: '無法載入題本列表，請稍後再試',
            })
        } finally {
            setIsLoadingQuestionSets(false)
        }
    }

    const handleStartPractice = async () => {
        setIsCreatingRoom(true)
        try {
            const body: any = { sourceType }

            if (sourceType === 'QUESTION_SET') {
                if (!selectedQuestionSet) {
                    alert('請選擇一個題本')
                    setIsCreatingRoom(false)
                    return
                }
                body.setId = selectedQuestionSet.id
            } else if (sourceType === 'SUBJECT_TAG') {
                if (!selectedSubject) {
                    alert('請選擇一個科目')
                    setIsCreatingRoom(false)
                    return
                }
                body.subject = selectedSubject
            }

            const response = await fetch('/api/play/practice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create practice room')
            }

            if (data.success && data.room?.room_code) {
                router.push(`/play/practice/${data.room.room_code}`)
            } else {
                throw new Error('Invalid response from server')
            }
        } catch (error) {
            console.error('Failed to create practice room:', error)
            handleApiError(error, 'Create Practice Room', {
                title: '建立失敗',
                description: '無法建立練習室，請稍後再試',
            })
            setIsCreatingRoom(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>選擇練習來源</DialogTitle>
                    <DialogDescription>選擇你想要練習的題目來源</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <RadioGroup value={sourceType} onValueChange={(value: string) => setSourceType(value as SourceType)}>
                        {/* Mixed Mode */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0 }}
                        >
                            <Card
                                className={`cursor-pointer transition-all ${sourceType === 'MIXED'
                                    ? 'border-amber-500 bg-amber-50/50'
                                    : 'hover:bg-accent'
                                    }`}
                                onClick={() => setSourceType('MIXED')}
                            >
                                <div className="flex items-start gap-3 p-4">
                                    <RadioGroupItem value="MIXED" id="mixed" className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shuffle className="h-5 w-5 text-cyan-600" />
                                            <Label htmlFor="mixed" className="text-base font-semibold cursor-pointer">
                                                混合題庫（推薦）
                                            </Label>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
                                                推薦
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            從所有題庫中隨機抽取，體驗最豐富
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Question Set Mode */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card
                                className={`cursor-pointer transition-all ${sourceType === 'QUESTION_SET'
                                    ? 'border-amber-500 bg-amber-50/50'
                                    : 'hover:bg-accent'
                                    }`}
                                onClick={() => setSourceType('QUESTION_SET')}
                            >
                                <div className="flex items-start gap-3 p-4">
                                    <RadioGroupItem value="QUESTION_SET" id="question-set" className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Book className="h-5 w-5 text-amber-600" />
                                            <Label htmlFor="question-set" className="text-base font-semibold cursor-pointer">
                                                我的題本
                                            </Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            使用已下載的題本進行練習
                                        </p>

                                        {/* Question Set List */}
                                        <AnimatePresence>
                                            {sourceType === 'QUESTION_SET' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="space-y-2"
                                                >
                                                    {isLoadingQuestionSets ? (
                                                        <div className="flex items-center justify-center py-8">
                                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                        </div>
                                                    ) : questionSets.length === 0 ? (
                                                        <Card className="p-4 text-center border-dashed bg-muted/30">
                                                            <Book className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                                                            <p className="text-sm text-muted-foreground mb-2">還沒有下載題本</p>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    router.push('/store-shop')
                                                                }}
                                                                className="border-amber-300 text-amber-900 hover:bg-amber-50"
                                                            >
                                                                <Store className="h-3 w-3 mr-1" />
                                                                前往題本商店
                                                            </Button>
                                                        </Card>
                                                    ) : (
                                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                                            {questionSets.map((set) => (
                                                                <Card
                                                                    key={set.id}
                                                                    className={`p-3 cursor-pointer transition-all ${selectedQuestionSet?.id === set.id
                                                                        ? 'border-amber-500 bg-amber-100'
                                                                        : 'hover:bg-accent border-border'
                                                                        }`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setSelectedQuestionSet(set)
                                                                    }}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="font-semibold text-sm truncate">{set.title}</h4>
                                                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                                                {set.description}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                                                                    難度 {set.difficulty_level}
                                                                                </span>
                                                                                {set.practice_count > 0 && (
                                                                                    <span>已練習 {set.practice_count} 次</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {selectedQuestionSet?.id === set.id && (
                                                                            <div className="shrink-0 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                                                                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Error Book Mode */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card
                                className={`cursor-pointer transition-all ${sourceType === 'ERROR_BOOK'
                                    ? 'border-amber-500 bg-amber-50/50'
                                    : 'hover:bg-accent'
                                    }`}
                                onClick={() => setSourceType('ERROR_BOOK')}
                            >
                                <div className="flex items-start gap-3 p-4">
                                    <RadioGroupItem value="ERROR_BOOK" id="error-book" className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Target className="h-5 w-5 text-red-600" />
                                            <Label htmlFor="error-book" className="text-base font-semibold cursor-pointer">
                                                錯題本
                                            </Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            針對性練習答錯的題目
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Subject Mode */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card
                                className={`cursor-pointer transition-all ${sourceType === 'SUBJECT_TAG'
                                    ? 'border-amber-500 bg-amber-50/50'
                                    : 'hover:bg-accent'
                                    }`}
                                onClick={() => setSourceType('SUBJECT_TAG')}
                            >
                                <div className="flex items-start gap-3 p-4">
                                    <RadioGroupItem value="SUBJECT_TAG" id="subject" className="mt-1" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sparkles className="h-5 w-5 text-purple-600" />
                                            <Label htmlFor="subject" className="text-base font-semibold cursor-pointer">
                                                特定科目
                                            </Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            專注練習某個科目
                                        </p>

                                        {/* Subject Selector */}
                                        <AnimatePresence>
                                            {sourceType === 'SUBJECT_TAG' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <SubjectSelect
                                                        value={selectedSubject}
                                                        onValueChange={setSelectedSubject}
                                                        placeholder="選擇科目"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </RadioGroup>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={onClose} className="flex-1" disabled={isCreatingRoom}>
                            取消
                        </Button>
                        <Button
                            onClick={handleStartPractice}
                            disabled={isCreatingRoom}
                            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
                        >
                            {isCreatingRoom ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    建立中...
                                </>
                            ) : (
                                '開始練習'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
