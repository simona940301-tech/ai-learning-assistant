'use client'

import type { SummarySection, Ref } from '@/lib/summary/types'
import { cn } from '@/lib/utils'

const BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-secondary/10 bg-card/5 px-3 py-1 text-xs text-foreground/70'

interface SummarySectionProps {
  icon: string
  title: string
  section: SummarySection
  highlight?: boolean
  onRefClick?: (ref: Ref) => void
}

export function SummarySectionBlock({ icon, title, section, highlight = false, onRefClick }: SummarySectionProps) {
  const ref = section.refs[0]

  return (
    <div
      className={cn(
        'rounded-3xl border border-secondary/20 bg-card/[0.02] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.35)] transition',
        highlight && 'border-cyan-400/40 bg-cyan-500/5',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">
          <span className="mr-2 text-xl text-foreground/80">{icon}</span>
          {title}
        </h3>
        {ref && (
          <button
            type="button"
            onClick={() => onRefClick?.(ref)}
            className={`${BADGE_CLASS} hover:border-secondary/30 hover:text-foreground`}
          >
            📎 來源：PDF P.{ref.page} Para.{ref.paragraph}
          </button>
        )}
      </div>
      <p className="mt-3 text-sm leading-7 text-foreground/85">{section.text}</p>
    </div>
  )
}

