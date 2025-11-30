'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

interface WrongQuestion {
  id: string
  questionText: string
  options: string[]
  correctAnswer: string
  userAnswer: string | null
  explanation?: string
  questionId?: string // 用於錯題本的 question_id
}

interface QuestionAskModalProps {
  question: WrongQuestion
  onClose: () => void
  onComplete: (questionId: string) => void
}

export function QuestionAskModal({
  question,
  onClose,
  onComplete,
}: QuestionAskModalProps) {
  const router = useRouter()
  const [questionText, setQuestionText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false) // 是否匿名發問
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      alert('請輸入你的問題')
      return
    }

    setIsSubmitting(true)
    try {
      // 構建貼文內容：包含題目和用戶問題
      const postContent = `【題目】\n${question.questionText}\n\n選項：\n${question.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n\n正確答案：${question.correctAnswer}\n\n【我的問題】\n${questionText.trim()}`

      // 提交到 community
      const response = await fetch('/api/community/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: postContent,
          is_anonymous: isAnonymous,
          question_metadata: {
            questionText: question.questionText,
            options: question.options,
            correctAnswer: question.correctAnswer,
            userAnswer: question.userAnswer,
            explanation: question.explanation,
            questionId: question.questionId || question.id, // 使用 questionId 或 id
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || '發布失敗')
      }

      const data = await response.json()

      // 成功後跳轉到 community 頁面
      if (data.community_url) {
        router.push(data.community_url)
      } else {
        router.push('/community')
      }

      onComplete(question.id)
      onClose()
    } catch (error) {
      console.error('[QuestionAskModal] Failed to submit:', error)
      alert(error instanceof Error ? error.message : '發布失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">求助學霸</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 題目內容（只讀） */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/90 mb-2">{question.questionText}</p>
            <div className="text-xs text-white/60">
              正確答案：{question.correctAnswer}
            </div>
          </div>

          {/* 提問輸入 */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              你的問題
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="例如：為什麼選 A 而不是 B？這題的關鍵點是什麼？"
              className="w-full h-32 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* 匿名選項 */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
            <input
              type="checkbox"
              id="is-anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-5 h-5 rounded border-white/30 bg-white/5 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
            <label htmlFor="is-anonymous" className="text-sm text-white/80 cursor-pointer">
              匿名發問（不顯示頭像和名字）
            </label>
          </div>

          {/* 回應預期提示 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-white/60 text-center"
          >
            平均 2 小時內，小夥伴會給你答覆！請耐心等待。
          </motion.p>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/30 text-white hover:bg-white/10"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !questionText.trim()}
            className="flex-1 bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {isSubmitting ? '提交中...' : '提問'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
