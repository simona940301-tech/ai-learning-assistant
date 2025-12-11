'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePlay } from '@/lib/play-context'
import { User, Bot, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'
import { MatchmakingModal } from './MatchmakingModal'

interface SystemBattleModalProps {
  onClose: () => void
}

export function SystemBattleModal({ onClose }: SystemBattleModalProps) {
  const { systemMode, setSystemMode, checkEnergy, startMatch } = usePlay()

  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>('english')
  const [timeLimit, setTimeLimit] = useState<20 | 30 | 45 | 60>(20) // 預設 20 秒
  const [quickSubject, setQuickSubject] = useState('english')
  const [quickTimeLimit, setQuickTimeLimit] = useState<20 | 30 | 45 | 60>(20)
  const [isPveTransitioning, setIsPveTransitioning] = useState(false)
  const hasStartedRef = useRef(false)

  // 🎯 MVP 階段：只保留 AI 訓練模式
  const modes = [
    {
      id: 'PVE_TRAINING' as const,
      title: 'AI 訓練',
      description: '與 AI 對戰，個人化題目練習',
      icon: Bot,
      requiresEnergy: true,
      requiresSubject: false,
    },
    // ⏸️ 暫時關閉：弱點會戰
    // {
    //   id: 'WEAKNESS_BATTLE' as const,
    //   title: '弱點會戰',
    //   description: '針對弱點知識點的對戰',
    //   icon: User,
    //   requiresEnergy: true,
    //   requiresSubject: false,
    // },
    // ⏸️ 暫時關閉：排位賽
    // {
    //   id: 'RANKED' as const,
    //   title: '學科排位賽',
    //   description: '選擇學科後進入排隊',
    //   icon: Trophy,
    //   requiresEnergy: true,
    //   requiresSubject: true,
    // },
  ]

  const subjects = [
    { id: 'english', name: '英文' },
  ]

  const handleModeSelect = async (modeId: typeof modes[number]['id']) => {
    const mode = modes.find(m => m.id === modeId)
    if (!mode) return

    if (mode.requiresEnergy) {
      // 只檢查 Energy，不消耗（將在大廳確認完成時才消耗）
      const result = await checkEnergy()
      if (!result.success) {
        toast.error('羽毛不足！')
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
      setSystemMode(modeId)
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

  const startQuickPVEBattle = async () => {
    // Prevent duplicate START_MATCH
    if (hasStartedRef.current) {
      console.log('[SystemBattleModal] Already started, ignoring duplicate click')
      return
    }

    hasStartedRef.current = true
    try {
      // 🎯 PVE 不需要 WebSocket - 使用 HTTP API
      // startMatch() 內部調用 /api/play/start-match (HTTP POST)
      // WebSocket 只用於 PVP 即時匹配

      // 🎯 關鍵修改：啟動過渡動畫
      console.log('[SystemBattleModal] 🚀 Starting PVE transition overlay')
      setIsPveTransitioning(true)

      // Artificial delay for the animation to be seen
      await new Promise(resolve => setTimeout(resolve, 2000))

      // PVE 現在使用 HTTP-only 模式，不需要 WS 連接




      const startResult = await startMatch({
        type: 'PVE_TRAINING',
        subject: quickSubject || null,
        timeLimit: quickTimeLimit,
        origin: 'QUICK_PVE',
      })
      if (!startResult.ok) {
        toast.error(startResult.error || '啟動失敗，請稍後再試')
        hasStartedRef.current = false
        setIsPveTransitioning(false)
        return
      }
      // 不要立即清空 systemMode，等到 ROUND_STARTED 時才清空
      // 這樣才能正確檢測 PVE 模式
      onClose()
      // Note: isPveTransitioning will be unmounted with the modal
    } catch (error) {
      console.error('[SystemBattleModal] Failed to start PVE match', error)
      toast.error('啟動失敗，請稍後再試')
      setIsPveTransitioning(false)
    } finally {
      hasStartedRef.current = false
    }
  }

  // 🎯 MVP 階段：只有一個模式時，直接進入 PVE 設定畫面
  useEffect(() => {
    if (modes.length === 1 && !systemMode) {
      setSystemMode('PVE_TRAINING')
    }
  }, [modes.length, setSystemMode, systemMode])



  // VS Transition Overlay
  if (isPveTransitioning) {
    return (
      <Dialog open={true} onOpenChange={() => { }}>
        <DialogContent className="max-w-full h-screen p-0 border-none bg-transparent shadow-none [&>button]:hidden">
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF6E9]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#FED168]/20 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#5B7CFF]/20 rounded-full blur-3xl"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
            </div>

            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              {/* VS Text */}
              <motion.div
                className="absolute z-20 text-[120px] font-black italic text-[#5D4037]"
                initial={{ scale: 0, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 0.2
                }}
              >
                <span className="relative">
                  VS
                  <motion.span
                    className="absolute -inset-2 text-[#FED168] -z-10 blur-sm"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    VS
                  </motion.span>
                </span>
              </motion.div>

              {/* Player Avatar Circle */}
              <motion.div
                className="absolute left-4 top-1/4 w-32 h-32 md:w-40 md:h-40 bg-white rounded-full border-4 border-[#5B7CFF] shadow-xl overflow-hidden z-10"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 20, delay: 0.1 }}
              >
                {/* Placeholder for User Avatar - Using generic icon or actual avatar if available */}
                <div className="w-full h-full bg-[#E8F5E9] flex items-center justify-center">
                  <User className="w-16 h-16 text-[#528555]" />
                </div>
              </motion.div>

              {/* AI Avatar Circle */}
              <motion.div
                className="absolute right-4 bottom-1/4 w-32 h-32 md:w-40 md:h-40 bg-white rounded-full border-4 border-[#FED168] shadow-xl overflow-hidden z-10"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 20, delay: 0.3 }}
              >
                <div className="w-full h-full bg-[#FFF3E0] flex items-center justify-center">
                  <Bot className="w-16 h-16 text-[#F57C00]" />
                </div>
              </motion.div>

              {/* Connecting Line (Lightning/Zap effect simplified) */}
              <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 400 400">
                <motion.path
                  d="M 100 150 L 300 250"
                  stroke="#5D4037"
                  strokeWidth="4"
                  strokeDasharray="10 10"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.2 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                />
              </svg>
            </div>

            {/* Loading Text */}
            <motion.div
              className="mt-12 text-[#5D4037] text-xl font-bold tracking-wider"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              配對中...
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    )
  }

  if (systemMode === 'PVE_TRAINING') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>快速系統對戰</DialogTitle>
            <DialogDescription>選擇學科與時間後直接進入 AI 對戰</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">學科</p>
              <div className="grid grid-cols-1 gap-2">
                {subjects.map((subject) => (
                  <Button
                    key={subject.id}
                    variant={quickSubject === subject.id ? 'default' : 'outline'}
                    onClick={() => setQuickSubject(subject.id)}
                    className="h-12"
                  >
                    {subject.name}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">作答時間</p>
              <div className="grid grid-cols-4 gap-2">
                {[20, 30, 45, 60].map((value) => (
                  <Button
                    key={value}
                    variant={quickTimeLimit === value ? 'default' : 'outline'}
                    onClick={() => setQuickTimeLimit(value as 20 | 30 | 45 | 60)}
                    className="h-12 flex-col"
                  >
                    <span className="text-xl font-bold">{value}</span>
                    <span className="text-xs">秒</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setSystemMode(null)
                  onClose()
                }}
              >
                返回
              </Button>
              <Button
                className="flex-1 bg-[#5B7CFF] text-white hover:bg-[#4a63d7]"
                onClick={startQuickPVEBattle}
              >
                立即開始
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
            <div className="grid grid-cols-1 gap-3">
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
          <DialogDescription>選擇對戰模式</DialogDescription>
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
