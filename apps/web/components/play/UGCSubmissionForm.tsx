'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectSelect, SUBJECT_OPTIONS } from '@/components/ui/subject-select'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2 } from 'lucide-react'

interface UGCSubmissionFormProps {
  onClose: () => void
  onSubmit: (data: UGCFormData) => Promise<void>
}

export interface UGCFormData {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  deceiverOption?: string
  subject: 'chinese' | 'english' | 'social' | 'science' | 'math'
  skillTags: string[]
  difficulty: number
}

export function UGCSubmissionForm({ onClose, onSubmit }: UGCSubmissionFormProps) {
  const [formData, setFormData] = useState<UGCFormData>({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    deceiverOption: '',
    subject: 'math',
    skillTags: [],
    difficulty: 3,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      setSubmitted(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error: any) {
      alert(error.message || '提交失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
            <h3 className="mb-2 text-xl font-bold">提交成功！</h3>
            <p className="text-sm text-muted-foreground">
              題目已提交審核，審核通過後將獲得獎勵
            </p>
          </motion.div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>提交 UGC 題目</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* 學科 */}
          <SubjectSelect
            value={formData.subject}
            onValueChange={(value: any) => {
              if (value) {
                setFormData({ ...formData, subject: value as UGCFormData['subject'] })
              }
            }}
            label="學科"
            placeholder="選擇學科"
            allowEmpty={false}
          />

          {/* 難度 */}
          <div>
            <Label htmlFor="difficulty">難度 (1-5)</Label>
            <Select
              value={formData.difficulty.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, difficulty: parseInt(value) })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - 基礎</SelectItem>
                <SelectItem value="2">2 - 簡單</SelectItem>
                <SelectItem value="3">3 - 中等</SelectItem>
                <SelectItem value="4">4 - 困難</SelectItem>
                <SelectItem value="5">5 - 極難</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 題目內容 */}
          <div>
            <Label htmlFor="questionText">題目內容</Label>
            <Textarea
              id="questionText"
              value={formData.questionText}
              onChange={(e) =>
                setFormData({ ...formData, questionText: e.target.value })
              }
              placeholder="輸入題目內容..."
              className="mt-1 min-h-[100px]"
              required
            />
          </div>

          {/* 選項 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="optionA">選項 A</Label>
              <Input
                id="optionA"
                value={formData.optionA}
                onChange={(e) =>
                  setFormData({ ...formData, optionA: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="optionB">選項 B</Label>
              <Input
                id="optionB"
                value={formData.optionB}
                onChange={(e) =>
                  setFormData({ ...formData, optionB: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="optionC">選項 C</Label>
              <Input
                id="optionC"
                value={formData.optionC}
                onChange={(e) =>
                  setFormData({ ...formData, optionC: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="optionD">選項 D</Label>
              <Input
                id="optionD"
                value={formData.optionD}
                onChange={(e) =>
                  setFormData({ ...formData, optionD: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* 正確答案 */}
          <div>
            <Label htmlFor="correctAnswer">正確答案</Label>
            <Select
              value={formData.correctAnswer}
              onValueChange={(value: 'A' | 'B' | 'C' | 'D') =>
                setFormData({ ...formData, correctAnswer: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 迷惑選項（可選） */}
          <div>
            <Label htmlFor="deceiverOption">迷惑選項文本（可選）</Label>
            <Input
              id="deceiverOption"
              value={formData.deceiverOption}
              onChange={(e) =>
                setFormData({ ...formData, deceiverOption: e.target.value })
              }
              placeholder="AI 生成的迷惑選項文本..."
              className="mt-1"
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交題目'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

