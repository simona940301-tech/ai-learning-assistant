'use client'

import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  tone?: 'info' | 'success' | 'warning'
}

const toneStyles: Record<NonNullable<Props['tone']>, string> = {
  info: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-600 text-white',
}

export function SystemNoticeBanner({ children, tone = 'info' }: Props) {
  return (
    <div className={`rounded-full px-4 py-1 text-xs font-medium ${toneStyles[tone]}`}>
      {children}
    </div>
  )
}
