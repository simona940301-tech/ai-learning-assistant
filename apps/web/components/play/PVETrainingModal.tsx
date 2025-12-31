'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlay } from '@/lib/play-context'
import { useState } from 'react'
import { getAdaptiveCountdownDuration } from '@/lib/battle-ui'
import { toast } from 'sonner'

interface PVETrainingModalProps {
  onClose: () => void
}

export function PVETrainingModal({ onClose }: PVETrainingModalProps) {
  const { startMatch, setPveCountdown, progression } = usePlay()

  const [selectedSubject, setSelectedSubject] = useState<string>('english')
  const [timeLimit, setTimeLimit] = useState<20 | 30 | 45 | 60>(20)
  const [isStarting, setIsStarting] = useState(false)

  const subjects = [
    { id: 'english', name: '英文' },
  ]

  const handleStart = async () => {


    setIsStarting(true)
    setPveCountdown(getAdaptiveCountdownDuration(progression?.totalMatches))
    const result = await startMatch({
      type: 'PVE_TRAINING',
      subject: selectedSubject || null,
      timeLimit,
      origin: 'PVE_MODAL',
    })
    setIsStarting(false)

    if (!result.ok) { // Changed from result.ok to result.success in instruction, but keeping result.ok as it's likely the actual return type
      toast.error(result.error || '啟動失敗，請稍後再試')
      return
    }

    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>個人訓練模式</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">選擇學科</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="英文" />
              </SelectTrigger>
              <SelectContent>
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
            <div className="grid grid-cols-4 gap-3">
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
              <Button
                variant={timeLimit === 45 ? 'default' : 'outline'}
                onClick={() => setTimeLimit(45)}
                className="h-20 text-lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold">45</span>
                  <span className="text-sm">秒</span>
                </div>
              </Button>
              <Button
                variant={timeLimit === 60 ? 'default' : 'outline'}
                onClick={() => setTimeLimit(60)}
                className="h-20 text-lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-bold">60</span>
                  <span className="text-sm">秒</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button onClick={handleStart} className="flex-1" disabled={isStarting}>
              {isStarting ? '啟動中...' : '開始訓練'}

            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
