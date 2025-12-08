'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectSelect } from '@/components/ui/subject-select'
import { Switch } from '@/components/ui/switch'
import { usePlay } from '@/lib/play-context'
import { Plus, Users, Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface CustomBattleModalProps {
  onClose: () => void
}

interface RoomSettings {
  roomName: string
  subject?: string
  questionSource: 'SYSTEM' | 'UGC' | 'MIXED'
  enableUserCreatedQuestions: boolean // 啟用用戶自創題目
  maxPlayers: number
  contractAmount?: number // P11: 合約金額（10/50/100 金幣）
}

export function CustomBattleModal({ onClose }: CustomBattleModalProps) {
  const { customMode, setCustomMode, checkEnergy, consumeEnergy } = usePlay()
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<{ roomCode: string; roomName: string } | null>(null)
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    roomName: '',
    subject: 'english',
    questionSource: 'SYSTEM',
    enableUserCreatedQuestions: false,
    maxPlayers: 2,
    contractAmount: undefined, // P11: 默認無合約
  })
  const [copied, setCopied] = useState(false)

  const handleCreateRoom = async () => {
    alert('自訂房間功能即將推出！')
    return

    if (!roomSettings.roomName.trim()) {
      alert('請輸入房間名稱')
      return
    }

    // 只檢查 Energy，不消耗
    const result = await checkEnergy()
    if (!result.success) {
      alert('羽毛不足！')
      return
    }

    setIsCreating(true)
    try {
      // Feature disabled
      throw new Error('即將推出')

      /* 
      // Legacy WebSocket logic removed
      */

      // 生成臨時房間代碼（實際應由服務端返回）
      const tempRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      setCreatedRoom({
        roomCode: tempRoomCode,
        roomName: roomSettings.roomName,
      })
      setCustomMode('CREATE_ROOM')
    } catch (error: any) {
      alert(error.message || '創建房間失敗')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      alert('請輸入房間代碼')
      return
    }

    // 只檢查 Energy，不消耗（將在大廳確認完成時才消耗）
    const result = await checkEnergy()
    if (!result.success) {
      alert('羽毛不足！')
      return
    }

    setIsJoining(true)
    try {
      const response = await fetch('/api/play/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase() }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error === 'ROOM_NOT_FOUND' ? '房間不存在' : data.error === 'ROOM_FULL' ? '房間已滿' : '加入失敗')
      }

      const data = await response.json()
      alert(`成功加入房間：${data.room.roomName}`)
      // Energy 將在大廳確認完成時才消耗
      onClose()
    } catch (error: any) {
      alert(error.message || '加入房間失敗')
    } finally {
      setIsJoining(false)
    }
  }

  const copyRoomCode = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (customMode === 'CREATE_ROOM' && createdRoom) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>房間創建成功</DialogTitle>
            <DialogDescription>房間已創建，可以分享房間代碼給其他玩家</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">房間名稱</Label>
              <p className="text-lg font-semibold">{createdRoom.roomName}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">房間代碼</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={createdRoom.roomCode}
                  readOnly
                  className="font-mono text-xl text-center font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyRoomCode}
                  title="複製房間代碼"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                分享此代碼給其他玩家加入
              </p>
            </div>
            <Button onClick={onClose} className="w-full">
              開始等待玩家
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (customMode === 'CREATE_ROOM') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>創建房間</DialogTitle>
            <DialogDescription>創建自訂對戰房間，設置房間名稱、學科和題目來源</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="roomName">房間名稱</Label>
              <Input
                id="roomName"
                value={roomSettings.roomName}
                onChange={(e) =>
                  setRoomSettings({ ...roomSettings, roomName: e.target.value })
                }
                placeholder="輸入房間名稱"
                className="mt-1"
              />
            </div>

            <SubjectSelect
              value={roomSettings.subject || ''}
              onValueChange={(value) =>
                setRoomSettings({
                  ...roomSettings,
                  subject: value || undefined,
                })
              }
              label="學科"
              placeholder="選擇學科"
              showOptional
            />

            <div>
              <Label htmlFor="questionSource">題目來源</Label>
              <Select
                value={roomSettings.questionSource}
                onValueChange={(value) =>
                  setRoomSettings({
                    ...roomSettings,
                    questionSource: value as 'SYSTEM' | 'UGC' | 'MIXED',
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM">系統題庫</SelectItem>
                  <SelectItem value="UGC">用戶自創題目</SelectItem>
                  <SelectItem value="MIXED">混合模式</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* P11: 合約金額預設選項 */}
            <div>
              <Label className="mb-2 block">合約金額（可選）</Label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={roomSettings.contractAmount === amount ? 'default' : 'outline'}
                    className={`transition-all ${roomSettings.contractAmount === amount
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                      : ''
                      }`}
                    onClick={() =>
                      setRoomSettings({
                        ...roomSettings,
                        contractAmount: roomSettings.contractAmount === amount ? undefined : amount,
                      })
                    }
                  >
                    {amount} 金幣
                  </Button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                設置合約金額可增加對戰獎勵
              </p>
            </div>

            {/* 用戶自創題目開關 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>啟用用戶自創題目</Label>
                <p className="text-xs text-muted-foreground">
                  使用社群創建的題目進行對戰
                </p>
              </div>
              <Switch
                checked={roomSettings.enableUserCreatedQuestions}
                onCheckedChange={(checked) =>
                  setRoomSettings({
                    ...roomSettings,
                    enableUserCreatedQuestions: checked,
                  })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCustomMode(null)}
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? '創建中...' : '創建房間'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>自訂對戰</DialogTitle>
          <DialogDescription>選擇創建房間或加入房間進行自訂對戰</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card
              className="cursor-pointer transition-all hover:bg-accent"
              onClick={() => setCustomMode('CREATE_ROOM')}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">創建房間</h3>
                  <p className="text-sm text-muted-foreground">
                    創建一個新的對戰房間
                  </p>
                </div>
                <span className="text-xs text-yellow-500">消耗 1 點</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="transition-all hover:bg-accent">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">加入房間</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    輸入房間代碼加入
                  </p>
                  <Input
                    type="text"
                    placeholder="房間代碼"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleJoinRoom}
                  disabled={isJoining || !roomCode.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  {isJoining ? '加入中...' : '加入'}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
