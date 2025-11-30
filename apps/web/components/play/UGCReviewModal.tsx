'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { LoadingSpinner, Skeleton } from '@/components/ui/loading-states'
import { EmptyState } from '@/components/ui/empty-states'

interface UGCReviewModalProps {
  onClose: () => void
}

interface UGCQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  subject: string
  difficulty: number
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  designer?: {
    username?: string
    email?: string
  }
}

export function UGCReviewModal({ onClose }: UGCReviewModalProps) {
  const [questions, setQuestions] = useState<UGCQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('PENDING')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const loadQuestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/play/ugc/review/list?status=${filterStatus}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 403) {
          alert('您沒有權限訪問此功能')
          onClose()
          return
        }
        throw new Error('載入失敗')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('[UGC Review] Failed to load questions:', error)
      alert('載入題目失敗')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, onClose])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const handleReview = async (questionId: string, action: 'APPROVE' | 'REJECT') => {
    setReviewingId(questionId)
    try {
      const response = await fetch('/api/play/ugc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          action,
          reviewNote: reviewNote || undefined,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '審核失敗')
      }

      alert(action === 'APPROVE' ? '題目已通過審核' : '題目已拒絕')
      setReviewNote('')
      loadQuestions()
    } catch (error: any) {
      alert(error.message || '審核失敗')
    } finally {
      setReviewingId(null)
    }
  }

  const getSubjectName = (subject: string) => {
    const map: Record<string, string> = {
      chinese: '國文',
      english: '英文',
      math: '數學',
      social: '社會',
      science: '自然',
    }
    return map[subject] || subject
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>UGC 題目審核</DialogTitle>
        </DialogHeader>

        {/* Filter */}
        <div className="pb-4 border-b">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">待審核</SelectItem>
              <SelectItem value="APPROVED">已通過</SelectItem>
              <SelectItem value="REJECTED">已拒絕</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="暫無題目"
              description={`目前沒有${filterStatus === 'PENDING' ? '待審核' : filterStatus === 'APPROVED' ? '已通過' : '已拒絕'}的題目`}
            />
          ) : (
            questions.map((question) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {getSubjectName(question.subject)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            難度 {question.difficulty}/5
                          </span>
                          {question.designer && (
                            <span className="text-xs text-muted-foreground">
                              設計者：{question.designer.username || question.designer.email}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold">{question.question_text}</h3>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`p-2 rounded ${question.correct_answer === 'A' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <span className="font-medium">A:</span> {question.option_a}
                        {question.correct_answer === 'A' && (
                          <CheckCircle className="inline ml-1 h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <div className={`p-2 rounded ${question.correct_answer === 'B' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <span className="font-medium">B:</span> {question.option_b}
                        {question.correct_answer === 'B' && (
                          <CheckCircle className="inline ml-1 h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <div className={`p-2 rounded ${question.correct_answer === 'C' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <span className="font-medium">C:</span> {question.option_c}
                        {question.correct_answer === 'C' && (
                          <CheckCircle className="inline ml-1 h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <div className={`p-2 rounded ${question.correct_answer === 'D' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                        <span className="font-medium">D:</span> {question.option_d}
                        {question.correct_answer === 'D' && (
                          <CheckCircle className="inline ml-1 h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>

                    {/* Review Note */}
                    {question.review_status === 'PENDING' && (
                      <div>
                        <Label htmlFor={`note-${question.id}`}>審核備註（可選）</Label>
                        <Textarea
                          id={`note-${question.id}`}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="輸入審核備註..."
                          className="mt-1 min-h-[60px]"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {question.review_status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReview(question.id, 'APPROVE')}
                          disabled={reviewingId === question.id}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                        >
                          {reviewingId === question.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              處理中...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              通過
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleReview(question.id, 'REJECT')}
                          disabled={reviewingId === question.id}
                          variant="destructive"
                          className="flex-1"
                        >
                          {reviewingId === question.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              處理中...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              拒絕
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        <div className="pt-4 border-t">
          <Button onClick={onClose} className="w-full">
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

