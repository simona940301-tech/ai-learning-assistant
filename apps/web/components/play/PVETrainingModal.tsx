'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlay } from '@/lib/play-context'
import { useState } from 'react'

interface PVETrainingModalProps {
  onClose: () => void
}

export function PVETrainingModal({ onClose }: PVETrainingModalProps) {
  const { sendWebSocketMessage, wsConnected, checkEnergy } = usePlay()
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [timeLimit, setTimeLimit] = useState<20 | 30>(20)
  const [isStarting, setIsStarting] = useState(false)

  const subjects = [
    { id: 'chinese', name: '國文' },
    { id: 'english', name: '英文' },
    { id: 'math', name: '數學' },
    { id: 'science', name: '自然' },
    { id: 'social', name: '社會' },
  ]

  const handleStart = async () => {
    if (!wsConnected) {
      alert('WebSocket 未連接，請稍候再試')
      return
    }

    // 檢查 Energy（將在大廳確認完成時才消耗）
    setIsStarting(true)
    const result = await checkEnergy()
    setIsStarting(false)

    if (!result.success) {
      alert('精力值不足！')
      return
    }

    // 發送 PVE 對戰開始消息
    sendWebSocketMessage({
      type: 'START_MATCH',
      match_type: 'PVE_TRAINING',
      subject: selectedSubject || null,
      time_limit: timeLimit,
    })

    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>個人訓練模式</DialogTitle>
          <DialogDescription>
            選擇學科和作答時間，開始 AI 驅動的個人訓練
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">選擇學科（可選）</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="全部學科" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部學科</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">作答時間</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={timeLimit === 20 ? 'default' : 'outline'}
                onClick={() => setTimeLimit(20)}
                className="h-20 text-lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold">20</span>
                  <span className="text-sm">秒</span>
                </div>
              </Button>
              <Button
                variant={timeLimit === 30 ? 'default' : 'outline'}
                onClick={() => setTimeLimit(30)}
                className="h-20 text-lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold">30</span>
                  <span className="text-sm">秒</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button onClick={handleStart} className="flex-1" disabled={!wsConnected || isStarting}>
              {isStarting ? '檢查中...' : '開始訓練'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

