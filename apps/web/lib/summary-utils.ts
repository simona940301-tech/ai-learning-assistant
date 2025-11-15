export interface FlashcardItem {
  question: string
  answer: string
}

export interface SummarySlices {
  why: string[]
  what: string[]
  how: string[]
  pitfalls: string[]
  selfCheck?: string
  flashcards: FlashcardItem[]
}

const SECTION_MAP: Record<string, keyof SummarySlices | 'flashcards'> = {
  考點: 'why',
  核心: 'what',
  要素: 'what',
  應用: 'how',
  步驟: 'how',
  混淆: 'pitfalls',
  自檢: 'pitfalls',
  快閃卡: 'flashcards',
  Flashcards: 'flashcards',
}

const TARGET_COUNTS: Record<'why' | 'what' | 'how' | 'pitfalls', number> = {
  why: 3,
  what: 5,
  how: 4,
  pitfalls: 3,
}

export function parseSummaryMarkdown(markdown: string): SummarySlices {
  const slices: SummarySlices = {
    why: [],
    what: [],
    how: [],
    pitfalls: [],
    flashcards: [],
  }

  if (!markdown.trim()) return slices

  const lines = markdown.split(/\r?\n/)
  let currentSection: keyof SummarySlices | 'flashcards' | null = null
  let pendingFlashcard: Partial<FlashcardItem> | null = null

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    if (trimmed.startsWith('##')) {
      currentSection = resolveSection(trimmed)
      if (currentSection !== 'flashcards' && pendingFlashcard) {
        finalizeFlashcard(pendingFlashcard, slices)
        pendingFlashcard = null
      }
      return
    }

    if (currentSection === 'flashcards') {
      if (/^Q\s*:/i.test(trimmed)) {
        if (pendingFlashcard) finalizeFlashcard(pendingFlashcard, slices)
        pendingFlashcard = { question: trimmed.replace(/^Q\s*:/i, '').trim() }
      } else if (/^A\s*:/i.test(trimmed) && pendingFlashcard) {
        pendingFlashcard.answer = trimmed.replace(/^A\s*:/i, '').trim()
        finalizeFlashcard(pendingFlashcard, slices)
        pendingFlashcard = null
      }
      return
    }

    if (!currentSection || trimmed.startsWith('---')) return

    const bullet = trimmed.replace(/^[-•\d\.\s]+/, '').trim()
    if (!bullet) return

    if (currentSection === 'pitfalls' && /自[我己]?檢|check/i.test(bullet)) {
      slices.selfCheck = bullet
      return
    }

    if (currentSection in slices) {
      const key = currentSection as keyof SummarySlices
      if (Array.isArray(slices[key])) {
        (slices[key] as string[]).push(bullet)
      }
    }
  })

  if (pendingFlashcard) finalizeFlashcard(pendingFlashcard, slices)
  return slices
}

function resolveSection(headingLine: string): keyof SummarySlices | 'flashcards' | null {
  const label = headingLine.replace(/^#+\s*/, '')
  const matched = Object.entries(SECTION_MAP).find(([keyword]) => label.includes(keyword))
  return matched ? matched[1] : null
}

function finalizeFlashcard(card: Partial<FlashcardItem>, slices: SummarySlices) {
  if (!card.question) return
  slices.flashcards.push({ question: card.question, answer: card.answer || '待補' })
}

export interface CoverageDatum {
  key: 'why' | 'what' | 'how' | 'pitfalls'
  label: string
  percent: number
  count: number
}

export function buildCoverage(slices: SummarySlices): CoverageDatum[] {
  return (['why', 'what', 'how', 'pitfalls'] as const).map((key) => {
    const count = slices[key].length
    const target = TARGET_COUNTS[key]
    const percent = Math.min(100, Math.round((count / target) * 100))
    const labelMap: Record<typeof key, string> = {
      why: 'WHY · 考點',
      what: 'WHAT · 核心',
      how: 'HOW · 步驟',
      pitfalls: 'CHECK · 混淆',
    }
    return {
      key,
      label: labelMap[key],
      percent: percent < 0 ? 0 : percent,
      count,
    }
  })
}
