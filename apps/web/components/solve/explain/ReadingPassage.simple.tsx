'use client'

import { forwardRef } from 'react'

interface ReadingPassageProps {
  paragraphs: string[]
  expanded: boolean
  onToggleExpand: () => void
}

export const ReadingPassageSimple = forwardRef<HTMLDivElement, ReadingPassageProps>(
  ({ paragraphs, expanded, onToggleExpand }, ref) => {
    if (!paragraphs.length) return null

    return (
      <div className="space-y-3">
        {/* Simple legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>📘 主題</span>
          <span>⚡ 轉折</span>
          <span>✓ 結論</span>
        </div>

        {/* Simple passage display */}
        <div
          ref={ref}
          className={`relative space-y-2 overflow-y-auto pr-2 text-sm leading-relaxed ${
            !expanded ? 'max-h-[33vh]' : ''
          }`}
        >
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" />
          <div className="pl-3 space-y-2">
            {paragraphs.map((para, idx) => (
              <p key={idx} className="text-muted-foreground" data-paragraph={idx}>
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? '收合' : '展開'}
        </button>
      </div>
    )
  }
)

ReadingPassageSimple.displayName = 'ReadingPassageSimple'
