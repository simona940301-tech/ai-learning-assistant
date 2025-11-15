'use client'

import { ReactNode, useMemo } from 'react'

type Props = {
  tempoHint: 'tighten' | 'steady' | 'soothe'
  arousalLevel?: number
  children: ReactNode
}

const variantStyles: Record<Props['tempoHint'], string> = {
  tighten: 'animate-[pulse_2s_ease-in-out_infinite] drop-shadow-sm',
  steady: '',
  soothe: 'opacity-95',
}

export function TempoPresenter({ tempoHint, arousalLevel, children }: Props) {
  const toneLabel = useMemo(() => {
    if (typeof arousalLevel !== 'number') return tempoHint
    return `${tempoHint} · ${(arousalLevel * 100).toFixed(0)}%`
  }, [tempoHint, arousalLevel])

  return (
    <div className="space-y-2">
      <span className="text-xs uppercase tracking-wide text-slate-500">{toneLabel}</span>
      <div className={`rounded-2xl border border-slate-100 bg-white/80 p-3 transition ${variantStyles[tempoHint]}`}>
        {children}
      </div>
    </div>
  )
}
