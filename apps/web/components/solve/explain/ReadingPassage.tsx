'use client'

import { forwardRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

type HighlightTag = 'theme' | 'turn' | 'conclusion'

export interface PassageSegment {
  text: string
  tag?: HighlightTag
  paragraphIndex: number
  sentenceIndex?: number
}

interface ReadingPassageProps {
  paragraphs: string[]
  expanded: boolean
  onToggleExpand: () => void
}

const THEME_KEYWORDS = ['main idea', 'mainly', 'primarily', 'focus', 'topic']
const TURN_KEYWORDS = [
  'however',
  'but',
  'yet',
  'nevertheless',
  'though',
  'although',
  'instead',
  'rather',
  'nonetheless',
  'on the other hand',
]
const CONCLUSION_KEYWORDS = [
  'therefore',
  'thus',
  'hence',
  'overall',
  'in conclusion',
  'to sum up',
  'as a result',
  'consequently',
  'finally',
]

const TAG_LABELS: Record<HighlightTag, string> = {
  theme: '主題',
  turn: '轉折',
  conclusion: '結論',
}

function detectSentenceHighlight(
  sentence: string,
  paragraphIndex: number,
  totalParagraphs: number,
  sentenceIndex: number,
  sentencesInParagraph: number
): HighlightTag | null {
  const lower = sentence.toLowerCase()
  if (!lower) return null

  // First sentence or contains theme keywords
  if (paragraphIndex === 0 && (sentenceIndex === 0 || THEME_KEYWORDS.some((kw) => lower.includes(kw)))) {
    return 'theme'
  }

  // Contains turn keywords
  if (TURN_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'turn'
  }

  // Contains conclusion keywords or last sentence of last paragraph
  const isLastParagraph = paragraphIndex === totalParagraphs - 1
  if (CONCLUSION_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'conclusion'
  }

  if (isLastParagraph && sentenceIndex === sentencesInParagraph - 1) {
    return 'conclusion'
  }

  return null
}

function splitIntoSentences(paragraph: string): string[] {
  return paragraph
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export const ReadingPassage = forwardRef<HTMLDivElement, ReadingPassageProps>(
  ({ paragraphs, expanded, onToggleExpand }, ref) => {
    // Forward ref to the container div
    const segments = useMemo(() => {
      const result: PassageSegment[] = []
      const totalParagraphs = paragraphs.length

      paragraphs.forEach((paragraph, pIdx) => {
        const sentences = splitIntoSentences(paragraph)
        if (!sentences.length) {
          result.push({
            text: paragraph,
            tag: undefined,
            paragraphIndex: pIdx,
          })
          return
        }

        sentences.forEach((sentence, sIdx) => {
          const tag = detectSentenceHighlight(sentence, pIdx, totalParagraphs, sIdx, sentences.length)
          result.push({
            text: sentence,
            tag: tag ?? undefined,
            paragraphIndex: pIdx,
            sentenceIndex: sIdx,
          })
        })
      })

      return result
    }, [paragraphs])

    if (!paragraphs.length) return null

    return (
      <div className="space-y-3">
        {/* Minimalist legend */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-sky-400/70" />
            主題
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-amber-400/70" />
            轉折
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-emerald-400/70" />
            結論
          </span>
        </div>

        {/* Passage content */}
        <div
          ref={ref}
          className={cn(
            'relative space-y-3 overflow-y-auto pr-2 text-[15px] leading-7',
            !expanded && 'max-h-[33vh]'
          )}
        >
          {/* Left navigation line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" />

          <div className="pl-3">
            {segments.map((seg, idx) => (
              <span
                key={idx}
                data-paragraph={seg.paragraphIndex}
                data-sentence={seg.sentenceIndex}
                className={cn(
                  'inline transition-all duration-200',
                  seg.tag === 'theme' && 'border-l-2 border-sky-400/60 pl-2 ml-[-0.5rem]',
                  seg.tag === 'turn' && 'border-l-2 border-amber-400/60 pl-2 ml-[-0.5rem]',
                  seg.tag === 'conclusion' && 'border-l-2 border-emerald-400/60 pl-2 ml-[-0.5rem]'
                )}
              >
                {seg.text}
                {seg.tag && (
                  <span className="ml-1.5 inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {TAG_LABELS[seg.tag]}
                  </span>
                )}{' '}
              </span>
            ))}
          </div>
        </div>

        {/* Expand/collapse button */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {expanded ? '收合文章' : '展開全文'}
        </button>
      </div>
    )
  }
)

ReadingPassage.displayName = 'ReadingPassage'
