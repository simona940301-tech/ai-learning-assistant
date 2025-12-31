'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'

interface WrongQuestion {
  id: string
  questionText: string
  options: string[]
  correctAnswer: string
  userAnswer: string | null
  explanation?: string
}

interface WrongQuestionEditModalProps {
  question: WrongQuestion
  onClose: () => void
  onSave: (updated: WrongQuestion) => void
}

export function WrongQuestionEditModal({
  question,
  onClose,
  onSave,
}: WrongQuestionEditModalProps) {
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('')

  const handleSave = () => {
    const updated: WrongQuestion = {
      ...question,
      // 這裡可以添加筆記、標籤等字段
      // 實際應該保存到數據庫
    }
    onSave(updated)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">編輯錯題</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 題目內容（只讀） */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/90">{question.questionText}</p>
            <div className="mt-2 text-xs text-white/60">
              正確答案：{question.correctAnswer}
              {question.userAnswer && ` | 你的答案：${question.userAnswer}`}
            </div>
          </div>

          {/* 學生筆記 */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              我的筆記
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="記錄你的解題思路、易錯點..."
              className="w-full h-24 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* 標籤 */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              標籤（用逗號分隔）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例如：三角函數, 易錯"
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 錯因（選填） */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              錯因 <span className="text-white/50 text-xs">（選填）</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">選擇錯因（選填）</option>
              <option value="concept">概念理解</option>
              <option value="calculation">計算錯誤</option>
              <option value="careless">粗心大意</option>
              <option value="time">時間不足</option>
            </select>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-white/30 text-white hover:bg-white/10"
          >
            返回列表
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-indigo-500 text-white hover:bg-indigo-400"
          >
            儲存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

