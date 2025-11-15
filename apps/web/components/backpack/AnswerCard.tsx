'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Answer } from '@/hooks/useScopedAsk'
import { track } from '@/lib/telemetry'

interface AnswerCardProps {
  answer: Answer
}

export function AnswerCard({ answer }: AnswerCardProps) {
  const [open, setOpen] = useState(false)

  const handleSaveNote = async () => {
    track('backpack.note.create', { answerId: answer.id })
    // TODO: Call saveNote API
    // await saveNote({ answerSummary: answer.summary, citations: answer.citations })
    console.log('[AnswerCard] Save note:', answer.id)
  }

  const handleCreateFlashcard = async () => {
    track('backpack.flashcard.create', { answerId: answer.id })
    // TODO: Call createFlashcard API
    // await createFlashcard({ keypoints: answer.summary, citation: answer.citations[0] })
    console.log('[AnswerCard] Create flashcard:', answer.id)
  }

  return (
    <Card className="p-3">
      <div className="text-sm leading-6 whitespace-pre-wrap">
        {open ? answer.detail ?? answer.summary : answer.summary}
      </div>
      {answer.detail && (
        <button
          className="mt-2 text-xs underline opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => setOpen(!open)}
        >
          {open ? '收合詳解' : '展開詳解'}
        </button>
      )}
      <EvidenceStrip citations={answer.citations} />
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveNote}
          className="text-xs h-8"
        >
          📌 存回筆記
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateFlashcard}
          className="text-xs h-8"
        >
          ➕ 轉閃卡
        </Button>
      </div>
    </Card>
  )
}

interface EvidenceStripProps {
  citations: Answer['citations']
}

function EvidenceStrip({ citations }: EvidenceStripProps) {
  if (citations.length === 0) return null

  return (
    <>
      <Separator className="my-2" />
      <div className="text-[11px] uppercase opacity-60 tracking-wide">Evidence</div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {citations.map((c, i) => (
          <span
            key={i}
            className="rounded-full border px-2 py-0.5 text-[11px] bg-muted/50"
            title={c.pointer}
          >
            {badge(c.scope)} · {c.label}
          </span>
        ))}
      </div>
    </>
  )
}

function badge(scope: string): string {
  const labels: Record<string, string> = {
    doc: 'This doc',
    backpack: 'My Backpack',
    purchased: 'Purchased',
    trusted: 'Trusted',
    web: 'Web',
  }
  return labels[scope] || scope
}




