'use client'

import { cn } from '@/lib/utils'

type ContentType = 'note' | 'wrong' | 'book'

const TABS: Array<{ key: ContentType; label: string }> = [
  { key: 'note', label: '筆記' },
  { key: 'wrong', label: '錯題' },
  { key: 'book', label: '題本' },
]

interface TypeTabsProps {
  activeType: ContentType
  onTypeChange: (type: ContentType) => void
}

export function TypeTabs({ activeType, onTypeChange }: TypeTabsProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="relative mx-auto flex w-full max-w-md items-center justify-center gap-3 px-4 py-3">
        {/* Tab Buttons */}
        {TABS.map(({ key, label }) => {
          const isActive = key === activeType
          return (
            <button
              key={key}
              onClick={() => onTypeChange(key)}
              data-tab={key}
              className={cn(
                'relative flex-1 px-6 py-2.5 text-[15px] font-medium transition-all duration-200',
                'border-b-[1px]',
                isActive
                  ? 'text-foreground border-[#D3BFA8]'
                  : 'text-foreground/60 hover:text-foreground/80 border-transparent'
              )}
            >
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
