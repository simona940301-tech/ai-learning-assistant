'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePlay } from '@/lib/play-context'
import { FileText, List, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { UGCSubmissionForm, UGCFormData } from './UGCSubmissionForm'
import { ContractBrowseModal } from './ContractBrowseModal'
import { ContractCreateModal } from './ContractCreateModal'

interface UGCContractModalProps {
  onClose: () => void
}

export function UGCContractModal({ onClose }: UGCContractModalProps) {
  const { ugcContractMode, setUGCContractMode, consumeEnergy } = usePlay()

  const modes = [
    {
      id: 'CREATE_CONTRACT' as const,
      title: '創建挑戰合約',
      description: '發起一個挑戰合約',
      icon: Sparkles,
      requiresEnergy: true,
    },
    {
      id: 'BROWSE_CONTRACTS' as const,
      title: '瀏覽合約',
      description: '查看所有公開合約',
      icon: List,
      requiresEnergy: false,
    },
    {
      id: 'CONTENT_CREATION' as const,
      title: '內容創作中心',
      description: '提交 UGC 題目',
      icon: FileText,
      requiresEnergy: false,
    },
  ]

  const handleModeSelect = async (modeId: typeof modes[number]['id']) => {
    const mode = modes.find(m => m.id === modeId)
    if (!mode) return

    if (mode.requiresEnergy) {
      const result = await consumeEnergy()
      if (!result.success) {
        alert('精力值不足！')
        return
      }
    }

    setUGCContractMode(modeId)
  }

  const handleUGCSubmit = async (data: UGCFormData) => {
    const response = await fetch('/api/play/ugc/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '提交失敗')
    }
  }

  if (ugcContractMode === 'CONTENT_CREATION') {
    return (
      <UGCSubmissionForm
        onClose={() => {
          setUGCContractMode(null)
          onClose()
        }}
        onSubmit={handleUGCSubmit}
      />
    )
  }

  if (ugcContractMode === 'BROWSE_CONTRACTS') {
    return (
      <ContractBrowseModal
        onClose={() => {
          setUGCContractMode(null)
          onClose()
        }}
      />
    )
  }

  if (ugcContractMode === 'CREATE_CONTRACT') {
    return (
      <ContractCreateModal
        onClose={() => {
          setUGCContractMode(null)
          onClose()
        }}
        onCreateSuccess={() => {
          // 創建成功後可以選擇瀏覽合約
        }}
      />
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>內容貢獻與合約</DialogTitle>
          <DialogDescription>選擇創建挑戰合約、瀏覽合約或提交 UGC 題目</DialogDescription>
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

