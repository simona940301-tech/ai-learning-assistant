'use client'

import type { Scope } from '@/hooks/useScopedAsk'

const ORDER: Scope[] = ['doc', 'backpack', 'purchased', 'trusted', 'web']

const LABEL: Record<Scope, string> = {
  doc: 'This doc',
  backpack: 'My Backpack',
  purchased: 'Purchased',
  trusted: 'Trusted',
  web: 'Web',
}

interface ScopeChipsProps {
  scope: Scope | null
  lockedScope: Scope | null
  onLock: (scope: Scope | null) => void
}

export function ScopeChips({ scope, lockedScope, onLock }: ScopeChipsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {ORDER.map((k) => {
        const active = scope && ORDER.indexOf(k) <= ORDER.indexOf(scope)
        const locked = lockedScope === k

        return (
          <button
            key={k}
            onClick={() => onLock(locked ? null : k)}
            className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
              active ? 'bg-foreground/6' : 'opacity-60'
            } ${locked ? 'ring-1 ring-foreground' : ''}`}
            title={k === 'doc' ? '只用此檔回答' : '擴張檢索範圍'}
          >
            {LABEL[k]}
          </button>
        )
      })}
      <button
        onClick={() => onLock(null)}
        className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
          lockedScope === null ? 'bg-foreground/6' : ''
        }`}
        title="自動擴張"
      >
        Auto
      </button>
    </div>
  )
}




