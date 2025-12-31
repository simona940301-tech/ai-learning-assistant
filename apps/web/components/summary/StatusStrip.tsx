'use client'

import { cn } from '@/lib/utils'

export type SummaryStageState = 'pending' | 'active' | 'done'

export interface SummaryStatusStep {
  id: string
  label: string
  state: SummaryStageState
}

interface StatusStripProps {
  steps: SummaryStatusStep[]
}

export function StatusStrip({ steps }: StatusStripProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-2xl border border-secondary/5 bg-card/40 px-4 py-3 backdrop-blur">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
            step.state === 'done' && 'bg-emerald-500/15 text-emerald-200',
            step.state === 'active' && 'bg-cyan-500/15 text-cyan-200',
            step.state === 'pending' && 'bg-card/5 text-foreground/60',
          )}
        >
          <span className="text-[10px] text-foreground/40">#{index + 1}</span>
          <span>{step.label}</span>
          {step.state === 'done' && <span className="text-emerald-200">✔</span>}
          {step.state === 'active' && <span className="text-cyan-200 animate-pulse">●</span>}
        </div>
      ))}
    </div>
  )
}
