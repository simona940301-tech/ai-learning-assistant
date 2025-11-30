'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePlay } from '@/lib/play-context'
import { Sparkles, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ContractCreateModalProps {
  onClose: () => void
  onCreateSuccess?: () => void
}

export function ContractCreateModal({ onClose, onCreateSuccess }: ContractCreateModalProps) {
  const { consumeEnergy } = usePlay()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    contractType: 'PVP_BATTLE' as 'PVP_BATTLE' | 'CHALLENGE' | 'TOURNAMENT',
    expiresInHours: '24',
  })

  const handleCreate = async () => {
    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      alert('請輸入有效的金額')
      return
    }

    const result = await consumeEnergy()
    if (!result.success) {
      alert('羽毛不足！')
      return
    }

    setIsCreating(true)
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.expiresInHours))

      const response = await fetch('/api/play/contract/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          contractType: formData.contractType,
          expiresAt: expiresAt.toISOString(),
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '創建失敗')
      }

      alert('合約創建成功！')
      onCreateSuccess?.()
      onClose()
    } catch (error: any) {
      alert(error.message || '創建合約失敗')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>創建挑戰合約</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center mb-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </motion.div>

          <div>
            <Label htmlFor="amount">合約金額</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="輸入金額"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              獲勝者將獲得 2 倍金額（雙方各鎖定此金額）
            </p>
          </div>

          <div>
            <Label htmlFor="contractType">合約類型</Label>
            <Select
              value={formData.contractType}
              onValueChange={(value) =>
                setFormData({ ...formData, contractType: value as 'PVP_BATTLE' | 'CHALLENGE' | 'TOURNAMENT' })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PVP_BATTLE">PVP 對戰</SelectItem>
                <SelectItem value="CHALLENGE">挑戰</SelectItem>
                <SelectItem value="TOURNAMENT">錦標賽</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expiresInHours">過期時間（小時）</Label>
            <Select
              value={formData.expiresInHours}
              onValueChange={(value) => setFormData({ ...formData, expiresInHours: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 小時</SelectItem>
                <SelectItem value="6">6 小時</SelectItem>
                <SelectItem value="12">12 小時</SelectItem>
                <SelectItem value="24">24 小時</SelectItem>
                <SelectItem value="48">48 小時</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !formData.amount}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  創建中...
                </>
              ) : (
                '創建合約'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
