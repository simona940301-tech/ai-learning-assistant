'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner, Skeleton } from '@/components/ui/loading-states'
import { EmptyState } from '@/components/ui/empty-states'
import { usePlay } from '@/lib/play-context'
import { Sparkles, List, Coins, Clock, User, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

interface ContractBrowseModalProps {
  onClose: () => void
}

interface Contract {
  id: string
  creator_id: string
  challenger_id: string | null
  amount: number
  status: 'PENDING' | 'LOCKED' | 'SETTLED' | 'CANCELLED' | 'EXPIRED'
  contract_type: 'PVP_BATTLE' | 'CHALLENGE' | 'TOURNAMENT'
  expires_at: string | null
  created_at: string
  creator?: { username: string; avatar_url?: string }
  challenger?: { username: string; avatar_url?: string }
  winner?: { username: string; avatar_url?: string }
}

export function ContractBrowseModal({ onClose }: ContractBrowseModalProps) {
  const { consumeEnergy } = usePlay()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [isAccepting, setIsAccepting] = useState<string | null>(null)

  useEffect(() => {
    loadContracts()
  }, [filterStatus, filterType])

  const loadContracts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (filterType) params.append('contractType', filterType)

      const response = await fetch(`/api/play/contract/list?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('載入失敗')
      }

      const data = await response.json()
      setContracts(data.contracts || [])
    } catch (error) {
      console.error('[Contract Browse] Failed to load contracts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptContract = async (contractId: string) => {
    setIsAccepting(contractId)
    try {
      const response = await fetch('/api/play/contract/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '承接失敗')
      }

      alert('成功承接合約！')
      loadContracts()
    } catch (error: any) {
      alert(error.message || '承接合約失敗')
    } finally {
      setIsAccepting(null)
    }
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('zh-TW')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20'
      case 'LOCKED':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20'
      case 'SETTLED':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20'
      case 'CANCELLED':
      case 'EXPIRED':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '等待承接'
      case 'LOCKED':
        return '已鎖定'
      case 'SETTLED':
        return '已結算'
      case 'CANCELLED':
        return '已取消'
      case 'EXPIRED':
        return '已過期'
      default:
        return status
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>瀏覽合約</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 pb-4 border-b">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部狀態</SelectItem>
              <SelectItem value="PENDING">等待承接</SelectItem>
              <SelectItem value="LOCKED">已鎖定</SelectItem>
              <SelectItem value="SETTLED">已結算</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="類型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部類型</SelectItem>
              <SelectItem value="PVP_BATTLE">PVP 對戰</SelectItem>
              <SelectItem value="CHALLENGE">挑戰</SelectItem>
              <SelectItem value="TOURNAMENT">錦標賽</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contract List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <EmptyState
              icon={List}
              title="暫無合約"
              description="目前沒有可用的合約，創建一個新合約開始挑戰吧！"
            />
          ) : (
            contracts.map((contract) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(contract.status)}`}
                        >
                          {getStatusText(contract.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {contract.contract_type === 'PVP_BATTLE'
                            ? 'PVP 對戰'
                            : contract.contract_type === 'CHALLENGE'
                            ? '挑戰'
                            : '錦標賽'}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-orange-500" />
                        <span className="text-lg font-bold">
                          {formatAmount(parseFloat(contract.amount.toString()))} 幣
                        </span>
                      </div>

                      {/* Players */}
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">發起者：</span>
                          <span className="font-medium">
                            {contract.creator?.username || '未知'}
                          </span>
                        </div>
                        {contract.challenger && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">挑戰者：</span>
                            <span className="font-medium">
                              {contract.challenger.username}
                            </span>
                          </div>
                        )}
                        {contract.winner && (
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="text-muted-foreground">獲勝者：</span>
                            <span className="font-medium text-yellow-600">
                              {contract.winner.username}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      {contract.expires_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                      <span>
                        {contract.expires_at
                          ? `過期：${new Date(contract.expires_at).toLocaleDateString('zh-TW')}`
                          : '無過期時間'}
                      </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {contract.status === 'PENDING' && !contract.challenger_id && (
                      <Button
                        onClick={() => handleAcceptContract(contract.id)}
                        disabled={isAccepting === contract.id}
                        size="sm"
                        className="shrink-0"
                      >
                        {isAccepting === contract.id ? '承接中...' : '承接'}
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        <div className="pt-4 border-t">
          <Button onClick={onClose} className="w-full">
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

