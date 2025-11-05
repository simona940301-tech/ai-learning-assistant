/**
 * Adapter: Convert ReadingVM to unified LongFormExplainVM
 *
 * Design: Minimal conversion layer, preserves existing ReadingVM structure
 * Scope: Only used in ReadingExplain component
 */

import type { ReadingVM, ReadingQuestionVM } from '@/lib/mapper/explain-presenter'
import type {
  LongFormExplainVM,
  PassageVM,
  LongFormQuestionVM,
  EvidenceSpan,
} from '@/lib/reading/types'

/**
 * Convert ReadingVM.passage to unified PassageVM
 */
function adaptPassage(passage: ReadingVM['passage']): PassageVM {
  return {
    raw: passage.paragraphs.join('\n\n'),
    paragraphs: passage.paragraphs.map((text, index) => ({
      id: `p${index + 1}`,
      text,
    })),
  }
}

/**
 * Convert ReadingQuestionVM.evidence to unified EvidenceSpan[]
 */
function adaptEvidence(
  evidence: ReadingQuestionVM['evidence']
): EvidenceSpan[] {
  if (!evidence || evidence.length === 0) return []

  return evidence.map((ev) => ({
    paraId: `p${ev.paragraphIndex + 1}`, // Convert 0-based to 1-based with 'p' prefix
    // Note: start/end character offsets not available in current ReadingVM
    // Can be added later for sentence-level highlighting
  }))
}

/**
 * Extract one-line reason from ReadingQuestionVM
 *
 * Priority:
 * 1. reasoningText (first line if multi-line)
 * 2. reason
 * 3. evidenceOneLine
 * 4. Default fallback
 */
function extractReasonOneLine(question: ReadingQuestionVM): string {
  if (question.reasoningText) {
    const firstLine = question.reasoningText.split('\n')[0].trim()
    if (firstLine.length > 0 && firstLine.length <= 100) {
      return firstLine
    }
  }

  if (question.reason && question.reason.length <= 100) {
    return question.reason
  }

  if (question.evidenceOneLine) {
    return `證據：「${question.evidenceOneLine.substring(0, 80)}${question.evidenceOneLine.length > 80 ? '...' : ''}」`
  }

  return '請展開查看完整解析'
}

/**
 * Convert ReadingQuestionVM to unified LongFormQuestionVM
 */
function adaptQuestion(question: ReadingQuestionVM): LongFormQuestionVM {
  return {
    id: question.qid,
    prompt: question.stem,
    answer: question.answerLetter || undefined,
    reasonOneLine: extractReasonOneLine(question),
    evidence: adaptEvidence(question.evidence),

    // Type-specific fields (preserved from ReadingQuestionVM)
    options: question.options.map((text, index) => ({
      key: String.fromCharCode(65 + index), // A, B, C, D
      text,
      verdict: question.answerIndex === index ? 'fit' : 'unfit',
      reason: question.inlineNotes?.[index]?.trapNote || question.counterpoints?.[String.fromCharCode(65 + index)] || '',
    })),

    fullExplanation: question.reasoningText || question.reasoning,
    discourseRole: question.meta?.strategy,
  }
}

/**
 * Convert ReadingVM to unified LongFormExplainVM
 *
 * Usage:
 * ```tsx
 * const unified = adaptReadingVM(view)
 * ```
 */
export function adaptReadingVM(view: ReadingVM): LongFormExplainVM {
  return {
    kind: 'E4',
    passage: adaptPassage(view.passage),
    questions: view.questions.map(adaptQuestion),
    meta: {
      conservative: false, // Reading comprehension is always from API
      parser: view.parserWarning
        ? {
            skip: false,
            reason: view.parserWarning,
          }
        : undefined,
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
