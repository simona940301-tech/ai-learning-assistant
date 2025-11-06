/**
 * Adapter: Convert ClozeVM to unified LongFormExplainVM
 *
 * Design: Minimal conversion layer for E2/E3 (文意選填/克漏字)
 * Scope: Only used in ClozeExplain component
 *
 * Evidence Mapping Strategy:
 * 1. If API provides paragraphIndex → direct conversion to paraId
 * 2. If only evidence text → paragraph containment search
 * 3. If no evidence → infer from blank position in article
 * 4. Best-effort synchronous mapping, non-blocking
 */

import type { ClozeVM } from '@/lib/mapper/explain-presenter'
import type {
  LongFormExplainVM,
  PassageVM,
  LongFormQuestionVM,
  EvidenceSpan,
} from '@/lib/reading/types'
import { segmentPassage } from '@/components/reading/PassageDock'

/**
 * Convert ClozeVM.article to unified PassageVM
 */
function adaptPassage(article?: ClozeVM['article']): PassageVM {
  if (!article || !article.en) {
    // Fallback: Empty passage
    return {
      raw: '',
      paragraphs: [],
    }
  }

  return {
    raw: article.en,
    paragraphs: segmentPassage(article.en),
  }
}

/**
 * Find paragraph ID containing the given text
 *
 * Strategy: Best-effort search, returns first match or null
 */
function findParagraphContaining(
  text: string,
  paragraphs: PassageVM['paragraphs']
): string | null {
  if (!text || !paragraphs || paragraphs.length === 0) return null

  // Normalize for comparison (lowercase, trim)
  const normalizedSearch = text.toLowerCase().trim()

  for (const para of paragraphs) {
    const normalizedPara = para.text.toLowerCase()

    if (normalizedPara.includes(normalizedSearch)) {
      return para.id
    }
  }

  return null
}

/**
 * Infer evidence from blank index and sentence span
 *
 * Strategy:
 * 1. If sentenceSpan.start exists, find paragraph containing that position
 * 2. Otherwise, use blank index to estimate paragraph (each blank ~ 1 paragraph)
 * 3. Fallback to first paragraph
 */
function inferEvidenceFromBlankPosition(
  blankIndex: number,
  totalBlanks: number,
  sentenceSpan: ClozeVM['meta']['sentenceSpan'],
  paragraphs: PassageVM['paragraphs']
): EvidenceSpan[] {
  if (paragraphs.length === 0) return []

  // Strategy 1: Use sentence span to find exact paragraph
  if (sentenceSpan && sentenceSpan.start >= 0) {
    let charCount = 0
    for (const para of paragraphs) {
      const paraEnd = charCount + para.text.length

      if (sentenceSpan.start >= charCount && sentenceSpan.start < paraEnd) {
        return [{ paraId: para.id }]
      }

      charCount = paraEnd + 1 // +1 for newline
    }
  }

  // Strategy 2: Estimate paragraph from blank index
  // Assumes blanks are roughly evenly distributed
  const estimatedParagraphIndex = Math.min(
    Math.floor((blankIndex / totalBlanks) * paragraphs.length),
    paragraphs.length - 1
  )

  if (estimatedParagraphIndex >= 0 && estimatedParagraphIndex < paragraphs.length) {
    return [{ paraId: paragraphs[estimatedParagraphIndex].id }]
  }

  // Strategy 3: Fallback to first paragraph
  return [{ paraId: paragraphs[0].id }]
}

/**
 * Extract evidence spans for a blank
 *
 * Priority:
 * 1. If evidence.paragraphIndex exists → direct mapping
 * 2. If evidence.text exists → search in paragraphs
 * 3. If sentenceSpan exists → infer from position
 * 4. Fallback → estimate from blank index
 */
function adaptEvidence(
  blankIndex: number,
  totalBlanks: number,
  meta: ClozeVM['meta'],
  paragraphs: PassageVM['paragraphs']
): EvidenceSpan[] {
  // TODO: Check if future ClozeVM includes evidence field
  // For now, use inference strategies

  // Strategy 1: Infer from sentence span or blank position
  return inferEvidenceFromBlankPosition(
    blankIndex,
    totalBlanks,
    meta.sentenceSpan,
    paragraphs
  )
}

/**
 * Extract one-line reason from ClozeVM
 *
 * Priority:
 * 1. meta.reasonLine (≤30 chars preferred)
 * 2. First option's reason (if available)
 * 3. Discourse tag as hint
 * 4. Default fallback
 */
function extractReasonOneLine(view: ClozeVM): string {
  // Priority 1: Explicit reason line
  if (view.meta.reasonLine) {
    const trimmed = view.meta.reasonLine.trim()
    if (trimmed.length > 0 && trimmed.length <= 100) {
      return trimmed
    }
    // Truncate if too long
    if (trimmed.length > 100) {
      return trimmed.substring(0, 97) + '...'
    }
  }

  // Priority 2: Correct option's reason
  if (view.answer?.reason) {
    const trimmed = view.answer.reason.trim()
    if (trimmed.length > 0 && trimmed.length <= 100) {
      return trimmed
    }
  }

  // Priority 3: Discourse tag hint
  if (view.meta.discourseTag) {
    return `此處為${view.meta.discourseTag}關係`
  }

  // Priority 4: Default fallback
  return '請展開查看完整解析'
}

/**
 * Convert ClozeVM to unified LongFormQuestionVM
 *
 * Note: ClozeVM represents a single blank, so this returns a single question
 */
function adaptClozeToQuestion(
  view: ClozeVM,
  passage: PassageVM
): LongFormQuestionVM {
  const blankNumber = view.meta.blankIndex + 1 // Convert to 1-based

  return {
    id: `blank-${blankNumber}`,
    prompt: view.meta.snippet || `( ${blankNumber} )`,
    answer: view.answer?.label,
    reasonOneLine: extractReasonOneLine(view),
    evidence: adaptEvidence(
      view.meta.blankIndex,
      view.meta.totalBlanks,
      view.meta,
      passage.paragraphs
    ),

    // Type-specific fields
    blank: {
      number: blankNumber,
      context: view.meta.snippet || '',
    },
    options: view.options?.map((opt) => ({
      key: opt.label,
      text: opt.text,
      verdict: opt.correct ? 'fit' : 'unfit',
      reason: opt.reason || '',
    })) || [],
    discourseRole: view.meta.discourseTag,
    fullExplanation: view.meta.reasonLine, // Can be expanded with more detail later
  }
}

/**
 * Convert ClozeVM to unified LongFormExplainVM
 *
 * Note: ClozeVM is single-blank, but we return array format for consistency
 *
 * Usage:
 * ```tsx
 * const unified = adaptClozeVM(view)
 * ```
 */
export function adaptClozeVM(view: ClozeVM): LongFormExplainVM {
  const passage = adaptPassage(view.article)

  return {
    kind: view.kind, // 'E3' or 'E2'
    passage,
    questions: [adaptClozeToQuestion(view, passage)],
    translation: view.article?.zh,
    meta: {
      conservative: false, // Cloze is always from API
    },
  }
}

/**
 * Get paragraph ID from 0-based index
 */
export function getParagraphId(index: number): string {
  return `p${index + 1}`
}

/**
 * Get 0-based paragraph index from ID
 */
export function getParagraphIndex(id: string): number {
  return parseInt(id.replace('p', ''), 10) - 1
}

/**
 * Find blank number marker in text
 * Matches: (1), (2), ( 3 ), etc.
 */
export function findBlankMarker(text: string, blankNumber: number): number {
  const patterns = [
    new RegExp(`\\(\\s*${blankNumber}\\s*\\)`, 'i'),
    new RegExp(`\\(${blankNumber}\\)`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      return match.index
    }
  }

  return -1
}
