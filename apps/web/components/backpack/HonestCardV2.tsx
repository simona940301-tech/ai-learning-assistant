'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { track } from '@/lib/telemetry'

interface HonestCardV2Props {
  onGoGlobal?: () => void
}

export function HonestCardV2({ onGoGlobal }: HonestCardV2Props) {
  const router = useRouter()

  const handleGoGlobal = () => {
    track('ask.scoped.honest.go_global')
    if (onGoGlobal) {
      onGoGlobal()
    } else {
      router.push('/ask')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="mb-4"
    >
      <Card className="p-4 border-amber-200/50 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground mb-1">
              這份講義中沒有找到明確答案
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed mb-3">
              要不要切換到全域模式補充？我可以使用更廣泛的資料來源來回答你的問題。
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleGoGlobal}
              className="text-xs h-8"
            >
              切換到全域 Ask
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

