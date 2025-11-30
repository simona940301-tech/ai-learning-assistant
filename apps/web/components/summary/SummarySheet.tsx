'use client'

import { useMemo, useState } from 'react'
import type {
  SummarySheetResponse,
  Ref,
  FlashcardPreview as FlashcardPreviewType,
  SummarySection,
} from '@/lib/summary/types'
import { ExecutiveSummary } from './ExecutiveSummary'
import { SummarySectionBlock } from './SummarySection'
import { StatusStrip, type SummaryStatusStep } from './StatusStrip'
import { FlashcardPreview } from './FlashcardPreview'
import { FlashcardOverlay } from './FlashcardOverlay'
import { ToolsDrawer } from './ToolsDrawer'
import { Button } from '@/components/ui/button'

type StorySectionKey = 'why' | 'what' | 'how' | 'check'

const STORY_SECTIONS: Array<{ key: StorySectionKey; icon: string; title: string }> = [
  { key: 'why', icon: '🎯', title: '核心目的' },
  { key: 'what', icon: '📘', title: '要學內容' },
  { key: 'how', icon: '🔧', title: '應用方式' },
  { key: 'check', icon: '⚠️', title: '盲點與誤區' },
] as const

interface SummarySheetProps {
  data: SummarySheetResponse
  statusSteps: SummaryStatusStep[]
  onRefNavigate?: (ref: Ref) => void
}

export function SummarySheet({ data, statusSteps, onRefNavigate }: SummarySheetProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeFlashcard, setActiveFlashcard] = useState<FlashcardPreviewType | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const previewFlashcards = data.flashcards.slice(0, 3)

  const sections = useMemo(
    () =>
      STORY_SECTIONS.map((meta) => {
        const section = data[meta.key] as SummarySection
        return {
          ...meta,
          section,
          highlight: activeTag ? section.text.includes(activeTag) : false,
        }
      }),
    [data, activeTag],
  )

  const totalFlashcards = data.flashcards.length

  const handleCopyCard = async (card: FlashcardPreviewType) => {
    try {
      await navigator.clipboard.writeText(`Q: ${card.question}\nA: ${card.answer}`)
    } catch (error) {
      console.error('Copy flashcard failed', error)
    }
  }

  const handleSaveCard = (card: FlashcardPreviewType) => {
    console.log('[SummarySheet] Add to backpack', card.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Summary Sheet</h2>
        <Button
          variant="outline"
          className="border-secondary/20 text-foreground/80"
          onClick={() => setDrawerOpen(true)}
        >
          工具 Tools
        </Button>
      </div>

      <StatusStrip steps={statusSteps} />

      <ExecutiveSummary section={data.executive_summary} onRefClick={onRefNavigate} />

      <div className="space-y-4">
        {sections.map((item) => (
          <SummarySectionBlock
            key={item.key}
            icon={item.icon}
            title={item.title}
            section={item.section}
            highlight={item.highlight}
            onRefClick={onRefNavigate}
          />
        ))}
      </div>

      <div className="rounded-3xl  bg-card/[0.02] p-5 text-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">快閃卡預覽</p>
          {totalFlashcards > 3 && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="text-xs text-foreground/70 hover:text-foreground"
            >
              + 查看全部（共 {totalFlashcards} 張）
            </button>
          )}
        </div>
        {previewFlashcards.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {previewFlashcards.map((card) => (
              <FlashcardPreview
                key={card.id}
                card={card}
                onSelect={setActiveFlashcard}
                onCopy={handleCopyCard}
                onSave={handleSaveCard}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-foreground/60">尚未生成快閃卡。</p>
        )}
      </div>

      <ToolsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        flashcards={data.flashcards}
        coverage={data.coverage}
        onFlashcardSelect={setActiveFlashcard}
        onRefClick={onRefNavigate}
        activeTag={activeTag}
        onTagToggle={setActiveTag}
        onCopyCard={handleCopyCard}
        onSaveCard={handleSaveCard}
      />

      <FlashcardOverlay
        card={activeFlashcard}
        onClose={() => setActiveFlashcard(null)}
        onCopy={handleCopyCard}
        onSave={handleSaveCard}
      />
    </div>
  )
}
