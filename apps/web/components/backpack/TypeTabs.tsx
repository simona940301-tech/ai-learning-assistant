'use client'

import { cn } from '@/lib/utils'

interface TypeTabsProps {
  activeType: 'note' | 'wrong' | 'book'
  onTypeChange: (type: 'note' | 'wrong' | 'book') => void
}

const types = [
  { id: 'note' as const, label: '筆記' },
  { id: 'wrong' as const, label: '錯題' },
  { id: 'book' as const, label: '題本' },
]

export function TypeTabs({ activeType, onTypeChange }: TypeTabsProps) {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="px-4 py-3">
        <div className="flex gap-2 bg-muted rounded-lg p-1">
          {types.map((type) => {
            const isActive = activeType === type.id
            return (
              <button
                key={type.id}
                onClick={() => onTypeChange(type.id)}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {type.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

