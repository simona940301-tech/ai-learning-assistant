'use client'

import type { FlashcardPreview as FlashcardPreviewType } from '@/lib/summary/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FlashcardPreviewProps {
  card: FlashcardPreviewType
  onSelect?: (card: FlashcardPreviewType) => void
  onCopy?: (card: FlashcardPreviewType) => void
  onSave?: (card: FlashcardPreviewType) => void
  variant?: 'preview' | 'drawer'
}

export function FlashcardPreview({
  card,
  onSelect,
  onCopy,
  onSave,
  variant = 'preview',
}: FlashcardPreviewProps) {
  const shortAnswer = card.answer.length > 80 ? `${card.answer.slice(0, 80)}…` : card.answer

  return (
    <div
      className={cn(
        'group rounded-2xl border border-secondary/10 bg-card/[0.02] p-4 text-left transition hover:border-primary/30',
        variant === 'preview' ? 'shadow-[0_15px_40px_rgba(0,0,0,0.35)]' : '',
      )}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect?.(card)}>
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Q</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{card.question}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-foreground/40">A</p>
        <p className="mt-1 text-sm text-foreground/80">{shortAnswer}</p>
      </button>
      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-secondary/10 text-xs text-foreground/80"
          onClick={() => onCopy?.(card)}
        >
          Copy
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-primary/80 text-xs text-foreground hover:bg-primary"
          onClick={() => onSave?.(card)}
        >
          加入背包
        </Button>
      </div>
    </div>
  )
}
