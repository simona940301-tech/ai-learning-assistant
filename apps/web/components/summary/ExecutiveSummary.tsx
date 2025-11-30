'use client'

import type { SummarySection, Ref } from '@/lib/summary/types'

interface ExecutiveSummaryProps {
  section: SummarySection
  onRefClick?: (ref: Ref) => void
}

export function ExecutiveSummary({ section, onRefClick }: ExecutiveSummaryProps) {
  const ref = section.refs[0]
  const words = section.text.length

  return (
    <div className="rounded-[32px] border border-secondary/10 bg-gradient-to-br from-card/[0.05] via-card/[0.02] to-transparent p-6 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-foreground/50">Executive Summary</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">5 秒掌握主軸</p>
        </div>
        <div className="text-right text-xs text-foreground/60">
          <p>{words} 字</p>
          {ref && (
            <button
              type="button"
              onClick={() => onRefClick?.(ref)}
              className="mt-1 rounded-full border border-secondary/15 px-3 py-1 text-[11px] text-foreground/80 hover:border-secondary/40"
            >
              📎 來源：PDF P.{ref.page} Para.{ref.paragraph}
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-base leading-relaxed text-foreground/85">{section.text}</p>
    </div>
  )
}
