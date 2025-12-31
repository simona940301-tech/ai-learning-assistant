'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface HonestCardProps {
  onAllowExpand: () => void
  onMyDataOnly: () => void
}

export function HonestCard({ onAllowExpand, onMyDataOnly }: HonestCardProps) {
  return (
    <Card className="p-3 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="text-sm font-medium">你的資料不足以支撐答案</div>
      <div className="text-sm opacity-70 mt-1 leading-relaxed">
        我可以先用「可信任來源」補一個穩健解。你也可以改成只用你的資料繼續問。
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onAllowExpand}
          className="text-xs h-8"
        >
          允許擴張
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onMyDataOnly}
          className="text-xs h-8"
        >
          只用我的資料
        </Button>
      </div>
    </Card>
  )
}




