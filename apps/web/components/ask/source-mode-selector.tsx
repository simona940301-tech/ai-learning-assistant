'use client'

import { useAsk } from '@/lib/ask-context'
import { ACADEMIC_WHITELIST } from '@/lib/types'

export function SourceModeSelector() {
  const { sourceMode, setSourceMode } = useAsk()

  return (
    <div className="space-y-3">
      {/* 來源模式選擇 */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">來源：</span>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              sourceMode === 'backpack'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setSourceMode('backpack')}
          >
            Backpack
          </button>
          <button
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              sourceMode === 'backpack_academic'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setSourceMode('backpack_academic')}
          >
            Backpack＋學術
          </button>
        </div>
      </div>

      {/* 學術白名單展示 */}
      {sourceMode === 'backpack_academic' && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-2">學術白名單：</p>
          <div className="flex flex-wrap gap-1">
            {ACADEMIC_WHITELIST.map((source) => (
              <span
                key={source.name}
                className="px-2 py-1 bg-background border rounded text-xs text-muted-foreground"
              >
                {source.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}