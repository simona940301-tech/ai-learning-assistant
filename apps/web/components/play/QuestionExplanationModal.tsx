'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, BookOpen, CheckCircle2, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface QuestionExplanationModalProps {
  questionId: string
  isOpen: boolean
  onClose: () => void
  userAnswer?: 'A' | 'B' | 'C' | 'D'
}

/**
 * 錯題詳解 Modal
 * 
 * 設計原則：
 * - 極簡主義：清晰的層次結構
 * - 學習導向：突出解題步驟和學習重點
 * - 按需載入：只在用戶點擊時才載入詳解
 */
export function QuestionExplanationModal({
  questionId,
  isOpen,
  onClose,
  userAnswer,
}: QuestionExplanationModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const loadExplanation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/questions/${questionId}/explanation`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '載入詳解失敗')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入詳解失敗')
    } finally {
      setLoading(false)
    }
  }, [questionId])

  useEffect(() => {
    if (isOpen && questionId) {
      loadExplanation()
    }
  }, [isOpen, questionId, loadExplanation])

  if (!isOpen) return null

  const question = data?.question
  const explanation = data?.explanation

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            題目詳解
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && question && (
          <div className="space-y-6">
            {/* 題目內容 */}
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">題目</h3>
              <p className="mb-4 whitespace-pre-wrap">{question.question_text}</p>

              {/* 選項 */}
              <div className="space-y-2">
                {(['A', 'B', 'C', 'D'] as const).map((optionId) => {
                  const optionText = question.options[optionId]
                  const isCorrect = optionId === question.correct_answer
                  const isUserAnswer = optionId === userAnswer

                  return (
                    <div
                      key={optionId}
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 ${isCorrect
                          ? 'border-green-500 bg-green-50'
                          : isUserAnswer && !isCorrect
                            ? 'border-red-500 bg-red-50'
                            : 'border-border bg-background'
                        }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold ${isCorrect
                            ? 'bg-green-500 text-white'
                            : isUserAnswer && !isCorrect
                              ? 'bg-red-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                      >
                        {optionId}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{optionText}</span>
                          {isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          {isUserAnswer && !isCorrect && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* 詳解內容 */}
            {explanation && (
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">詳解</h3>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-muted-foreground">
                    {explanation.explanation_text}
                  </div>
                </div>

                {/* 正確解析 (New) */}
                {explanation.option_analysis?.correctAnalysis && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      正確解析
                    </h4>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      {explanation.option_analysis.correctAnalysis}
                    </div>
                  </div>
                )}

                {/* 選項分析 */}
                {(() => {
                  const oa = explanation.option_analysis || {};
                  // 兼容舊資料 (oa 本身就是 map) 和新資料 (oa.optionAnalysis 是 map)
                  // 如果 oa.optionAnalysis 存在且是物件，優先使用它；否則如果 oa 本身包含 A-D 鍵，使用 oa
                  let analysisMap = oa.optionAnalysis || oa;

                  // 過濾出僅含 A, B, C, D 的項目，避免顯示 correctAnalysis 等系統欄位
                  const validKeys = ['A', 'B', 'C', 'D'];
                  const entries = Object.entries(analysisMap || {})
                    .filter(([key]) => validKeys.includes(key));

                  if (entries.length === 0) return null;

                  return (
                    <div className="mt-6">
                      <h4 className="mb-3 text-sm font-semibold">選項分析</h4>
                      <div className="space-y-2">
                        {entries.map(([optionId, content]) => {
                          const text = String(content);
                          const isDistractor = text.includes('[易錯]');
                          const cleanText = text.replace('[易錯]', '').trim();

                          return (
                            <div key={optionId} className={`rounded-lg border p-3 ${isDistractor ? 'bg-orange-50 border-orange-200' : 'bg-muted/50'}`}>
                              <div className="mb-1 font-semibold flex items-center gap-2">
                                選項 {optionId}
                                {isDistractor && (
                                  <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                                    ⚠️ 易錯
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{cleanText}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* 學習重點 */}
            {explanation?.mastery_focus_points && explanation.mastery_focus_points.length > 0 && (
              <Card className="border-blue-200 bg-blue-50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-900">
                  <BookOpen className="h-5 w-5" />
                  學習重點
                </h3>
                <ul className="space-y-2">
                  {explanation.mastery_focus_points.map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* 知識標籤 */}
            {question.knowledge_tags && question.knowledge_tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {question.knowledge_tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 關閉按鈕 */}
            <div className="flex justify-end">
              <Button onClick={onClose}>關閉</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

