'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Edit, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface MyQuestionsModalProps {
  onClose: () => void
}

interface UGCQuestion {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  userCreatedHint?: string
  subject: string
  difficulty: number
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  usageCount: number
  totalRewards: number
  createdAt: string
  updatedAt: string
}

const SUBJECT_NAMES: Record<string, string> = {
  chinese: '國文',
  english: '英文',
  math: '數學',
  social: '社會',
  science: '自然',
}

const STATUS_CONFIG = {
  PENDING: { label: '待審核', icon: Clock, color: 'bg-yellow-500' },
  APPROVED: { label: '已通過', icon: CheckCircle, color: 'bg-green-500' },
  REJECTED: { label: '已拒絕', icon: XCircle, color: 'bg-red-500' },
}

export function MyQuestionsModal({ onClose }: MyQuestionsModalProps) {
  const [questions, setQuestions] = useState<UGCQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<UGCQuestion | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/play/ugc-questions?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('獲取題目失敗')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error: any) {
      console.error('[My Questions] Fetch error:', error)
      toast.error(error.message || '獲取題目失敗')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleDelete = async (questionId: string) => {
    if (!confirm('確定要刪除這個題目嗎？')) return

    try {
      const response = await fetch(`/api/play/ugc-questions?id=${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '刪除失敗')
      }

      toast.success('題目已刪除')
      fetchQuestions()
    } catch (error: any) {
      console.error('[My Questions] Delete error:', error)
      toast.error(error.message || '刪除失敗')
    }
  }

  const filteredQuestions = questions

  if (selectedQuestion) {
    return (
      <Dialog open={true} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>題目詳情</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{SUBJECT_NAMES[selectedQuestion.subject]}</Badge>
              <Badge variant="outline">難度 {selectedQuestion.difficulty}</Badge>
              <Badge className={STATUS_CONFIG[selectedQuestion.reviewStatus].color}>
                {STATUS_CONFIG[selectedQuestion.reviewStatus].label}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">題目</label>
              <p className="mt-1 text-base">{selectedQuestion.questionText}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['A', 'B', 'C', 'D'].map((option) => {
                const key = `option${option}` as keyof UGCQuestion
                const isCorrect = selectedQuestion.correctAnswer === option
                return (
                  <div
                    key={option}
                    className={`rounded-lg border p-3 ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{option}.</span>
                      <span>{String(selectedQuestion[key])}</span>
                      {isCorrect && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedQuestion.userCreatedHint && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">解題提示</label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedQuestion.userCreatedHint}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
              <div>
                <p className="text-sm text-muted-foreground">使用次數</p>
                <p className="text-xl font-bold">{selectedQuestion.usageCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">累計獎勵</p>
                <p className="text-xl font-bold">{selectedQuestion.totalRewards} 金幣</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedQuestion(null)} className="flex-1">
                返回
              </Button>
              {selectedQuestion.reviewStatus === 'PENDING' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedQuestion(null)
                    handleDelete(selectedQuestion.id)
                  }}
                  className="flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>我的自創題目</DialogTitle>
          <DialogDescription>管理你創建的所有題目</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 狀態篩選 */}
          <div className="flex gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'ALL' ? '全部' : STATUS_CONFIG[status].label}
              </Button>
            ))}
          </div>

          {/* 題目列表 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>尚無題目</p>
              <p className="text-sm">開始創建你的第一個題目吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredQuestions.map((question, index) => {
                  const StatusIcon = STATUS_CONFIG[question.reviewStatus].icon
                  return (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="flex-1" onClick={() => setSelectedQuestion(question)}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {SUBJECT_NAMES[question.subject]}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                難度 {question.difficulty}
                              </Badge>
                              <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white ${STATUS_CONFIG[question.reviewStatus].color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {STATUS_CONFIG[question.reviewStatus].label}
                              </div>
                            </div>
                            <p className="text-sm line-clamp-2">{question.questionText}</p>
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>使用 {question.usageCount} 次</span>
                              <span>獎勵 {question.totalRewards} 金幣</span>
                              <span>創建於 {new Date(question.createdAt).toLocaleDateString('zh-TW')}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedQuestion(question)}
                              title="查看詳情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {question.reviewStatus === 'PENDING' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(question.id)}
                                title="刪除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
