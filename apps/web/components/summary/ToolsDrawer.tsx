'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { CoverageEntry, FlashcardPreview as FlashcardPreviewType, Ref } from '@/lib/summary/types'
import { FlashcardPreview } from './FlashcardPreview'

interface ToolsDrawerProps {
  open: boolean
  onClose: () => void
  flashcards: FlashcardPreviewType[]
  coverage: CoverageEntry[]
  onFlashcardSelect: (card: FlashcardPreviewType) => void
  onRefClick?: (ref: Ref) => void
  activeTag?: string | null
  onTagToggle?: (tag: string | null) => void
  onCopyCard?: (card: FlashcardPreviewType) => void
  onSaveCard?: (card: FlashcardPreviewType) => void
}

export function ToolsDrawer({
  open,
  onClose,
  flashcards,
  coverage,
  onFlashcardSelect,
  onRefClick,
  activeTag,
  onTagToggle,
  onCopyCard,
  onSaveCard,
}: ToolsDrawerProps) {
  const uniqueTags = Array.from(new Set(flashcards.flatMap((card) => card.tags))).filter(Boolean)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-30 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="h-full w-full max-w-lg overflow-y-auto border-l border-secondary/10 bg-card p-6 text-foreground shadow-2xl"
          >
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">Tools Drawer</p>
                <h2 className="mt-1 text-xl font-semibold">工具箱</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-secondary/10 px-3 py-1 text-xs text-foreground/70 hover:border-secondary/40"
              >
                關閉
              </button>
            </header>

            <section className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-semibold">Flashcards（全列表）</p>
                <div className="mt-3 space-y-3">
                  {flashcards.map((card) => (
                    <FlashcardPreview
                      key={card.id}
                      card={card}
                      onSelect={onFlashcardSelect}
                      onCopy={onCopyCard}
                      onSave={onSaveCard}
                      variant="drawer"
                    />
                  ))}
                  {!flashcards.length && (
                    <p className="text-sm text-foreground/60">尚未生成快閃卡。</p>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-secondary/10 bg-card/[0.02] p-4">
                <p className="text-sm font-semibold text-foreground">覆蓋率</p>
                <div className="mt-4 space-y-3">
                  {coverage.map((entry) => (
                    <div key={entry.section}>
                      <div className="flex items-center justify-between text-xs text-foreground/60">
                        <span>{sectionLabel(entry.section)}</span>
                        <span>{entry.refs.length} 段</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-secondary/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                          style={{ width: `${Math.min(entry.refs.length * 20, 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-foreground/60">
                        {entry.refs.map((ref, index) => (
                          <button
                            key={`${entry.section}-${index}`}
                            type="button"
                            onClick={() => onRefClick?.(ref)}
                            className="rounded-full border border-white/10 px-2 py-0.5 hover:border-white/40"
                          >
                            P.{ref.page} · Para.{ref.paragraph}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {uniqueTags.length ? (
                <div className="rounded-2xl border border-secondary/10 bg-card/[0.02] p-4">
                  <p className="text-sm font-semibold">標籤 / Filters</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {uniqueTags.map((tag) => {
                      const active = activeTag === tag
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => onTagToggle?.(active ? null : tag)}
                          className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-primary/30 text-primary' : 'border-secondary/10 text-foreground/70'
                            }`}
                        >
                          #{tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-secondary/10 bg-card/[0.02] p-4">
                <p className="text-sm font-semibold">歷屆試題推薦</p>
                <p className="mt-2 text-sm text-foreground/70">
                  一旦上傳歷屆題庫，系統會在此處推薦對應試題與練習連結。
                </p>
              </div>
            </section>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function sectionLabel(section: CoverageEntry['section']) {
  switch (section) {
    case 'why':
      return 'WHY · 核心目的'
    case 'what':
      return 'WHAT · 要學內容'
    case 'how':
      return 'HOW · 應用方式'
    case 'check':
      return 'CHECK · 盲點'
    case 'executive_summary':
      return '摘要'
  }
}
