'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePlay } from '@/lib/play-context'
import { User, Bot, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { MatchmakingModal } from './MatchmakingModal'
import { PVETrainingModal } from './PVETrainingModal'

interface SystemBattleModalProps {
  onClose: () => void
}

export function SystemBattleModal({ onClose }: SystemBattleModalProps) {
  const { systemMode, setSystemMode, checkEnergy, consumeEnergy } = usePlay()
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>()
  const [timeLimit, setTimeLimit] = useState<20 | 30>(20) // 預設 20 秒

  const modes = [
    {
      id: 'PVE_TRAINING' as const,
      title: '個人訓練模式',
      description: 'AI 驅動的個人錯題訓練',
      icon: Bot,
      requiresEnergy: true,
      requiresSubject: false,
    },
    {
      id: 'WEAKNESS_BATTLE' as const,
      title: '弱點會戰',
      description: '針對弱點知識點的對戰',
      icon: User,
      requiresEnergy: true,
      requiresSubject: false,
    },
    {
      id: 'RANKED' as const,
      title: '學科排位賽',
      description: '選擇學科後進入排隊',
      icon: Trophy,
      requiresEnergy: true,
      requiresSubject: true,
    },
  ]

  const subjects = [
    { id: 'chinese', name: '國文' },
    { id: 'english', name: '英文' },
    { id: 'math', name: '數學' },
    { id: 'science', name: '自然' },
    { id: 'social', name: '社會' },
  ]

  const handleModeSelect = async (modeId: typeof modes[number]['id']) => {
    const mode = modes.find(m => m.id === modeId)
    if (!mode) return

    if (mode.requiresEnergy) {
      // 只檢查 Energy，不消耗（將在大廳確認完成時才消耗）
      const result = await checkEnergy()
      if (!result.success) {
        alert('精力值不足！')
        return
      }
    }

    if (mode.requiresSubject) {
      setSystemMode(modeId)
      // 等待選擇學科
    } else if (modeId === 'PVE_TRAINING') {
      // PVE 模式直接開始
      setSystemMode(modeId)
    } else {
      // 弱點會戰直接開始匹配
      setShowMatchmaking(true)
    }
  }

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject)
    // 不立即顯示匹配，先讓用戶選擇時間
  }

  const handleStartMatchmaking = () => {
    setShowMatchmaking(true)
  }

  if (systemMode === 'PVE_TRAINING') {
    return (
      <PVETrainingModal
        onClose={() => {
          setSystemMode(null)
          onClose()
        }}
      />
    )
  }

  if (showMatchmaking && systemMode) {
    return (
      <MatchmakingModal
        onCancel={() => {
          setShowMatchmaking(false)
          setSystemMode(null)
          setSelectedSubject(undefined)
        }}
        matchType={systemMode === 'RANKED' ? 'RANKED' : 'WEAKNESS_BATTLE'}
        subject={selectedSubject}
        timeLimit={timeLimit}
      />
    )
  }

  // 時間選擇界面（在選擇學科或弱點會戰後）
  if ((systemMode === 'RANKED' && selectedSubject) || (systemMode === 'WEAKNESS_BATTLE')) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>選擇作答時間</DialogTitle>
            <DialogDescription>
              {systemMode === 'RANKED' 
                ? `選擇 ${subjects.find(s => s.id === selectedSubject)?.name} 排位賽的作答時間`
                : '選擇弱點會戰的作答時間'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (systemMode === 'RANKED') {
                    setSelectedSubject(undefined)
                  } else {
                    setSystemMode(null)
                  }
                }}
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={handleStartMatchmaking}
                className="flex-1"
              >
                開始匹配
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (systemMode === 'RANKED' && !selectedSubject) {
    // 學科選擇界面
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>選擇學科</DialogTitle>
            <DialogDescription>選擇要進行排位賽的學科</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subject) => (
                <Button
                  key={subject.id}
                  variant="outline"
                  onClick={() => handleSubjectSelect(subject.id)}
                  className="h-20"
                >
                  {subject.name}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setSystemMode(null)}
              className="mt-4 w-full"
            >
              返回
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>系統對戰</DialogTitle>
          <DialogDescription>選擇系統對戰模式：個人訓練、弱點會戰或排位賽</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {modes.map((mode, index) => {
            const Icon = mode.icon
            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:bg-accent"
                  onClick={() => handleModeSelect(mode.id)}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{mode.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {mode.description}
                      </p>
                    </div>
                    {mode.requiresEnergy && (
                      <span className="text-xs text-yellow-500">消耗 1 點</span>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

