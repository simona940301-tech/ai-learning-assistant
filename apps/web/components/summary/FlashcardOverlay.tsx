'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { FlashcardPreview } from '@/lib/summary/types'
import { Button } from '@/components/ui/button'

interface FlashcardOverlayProps {
  card: FlashcardPreview | null
  onClose: () => void
  onCopy?: (card: FlashcardPreview) => void
  onSave?: (card: FlashcardPreview) => void
}

export function FlashcardOverlay({ card, onClose, onCopy, onSave }: FlashcardOverlayProps) {
  return (
    <AnimatePresence>
      {card && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="h-full w-full max-w-md border-l border-secondary/10 bg-card p-6 text-foreground shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">Flashcard</p>
                <h3 className="mt-2 text-xl font-semibold">{card.question}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-secondary/10 px-3 py-1 text-xs text-foreground/70 hover:border-secondary/40"
              >
                關閉
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-secondary/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">答案</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">{card.answer}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-secondary/10 px-3 py-1 text-[11px] text-foreground/70">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="mt-4 text-xs text-foreground/60">
              {card.refs.length ? (
                <p>
                  📎 來源：{' '}
                  {card.refs.map((ref) => `P.${ref.page} Para.${ref.paragraph}`).join('、')}
                </p>
              ) : (
                <p>尚未提供來源</p>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1 bg-transparent text-foreground/80"
                variant="outline"
                onClick={() => onCopy?.(card)}
              >
                Copy
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/80" onClick={() => onSave?.(card)}>
                加入背包
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
