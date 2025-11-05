/**
 * Unified data models for long-form question types
 *
 * Design Principles:
 * - Minimalism: Only essential fields
 * - Progressive Disclosure: Support collapsed/expanded states
 * - Evidence-First: Built-in support for passage highlighting
 *
 * Covers:
 * - E2/E3: Cloze / 文意選填
 * - E4: Reading / 閱讀理解
 * - E5_DISCOURSE: Discourse / 篇章結構
 * - E5_INSERT: Sentence Insertion / 選句插入
 */

/**
 * Evidence span pointing to a paragraph (and optionally character range)
 */
export interface EvidenceSpan {
  /** Paragraph ID (e.g., 'p1', 'p2') */
  paraId: string
  /** Optional: Start character offset within paragraph (for sentence-level highlighting) */
  start?: number
  /** Optional: End character offset within paragraph */
  end?: number
}

/**
 * Passage data with paragraph segmentation
 */
export interface PassageVM {
  /** Raw passage text (sanitized HTML allowed) */
  raw: string
  /** Segmented paragraphs with stable IDs */
  paragraphs: Array<{
    id: string // e.g., 'p1', 'p2', 'p3'
    text: string // paragraph content
  }>
}

/**
 * Unified question model for all long-form types
 */
export interface LongFormQuestionVM {
  /** Stable question ID */
  id: string

  /** Question prompt/stem */
  prompt: string

  /** Answer (if available) - format: "(A) answer text" or "A" */
  answer?: string

  /** One-line reason (shown in collapsed state) */
  reasonOneLine?: string

  /** Evidence spans for highlighting in passage */
  evidence?: EvidenceSpan[]

  // Type-specific fields (optional)

  /** Options for multiple choice */
  options?: Array<{
    key: string // 'A', 'B', 'C', 'D', 'E'
    text: string
    verdict?: 'fit' | 'unfit' // for showing correct/incorrect
    reason?: string // distractor note
  }>

  /** Blank information for cloze */
  blank?: {
    number: number // (1), (2), etc.
    context: string // surrounding text
  }

  /** Full explanation (Markdown, shown when expanded) */
  fullExplanation?: string

  /** Grammar highlights for cloze */
  grammarHighlights?: string[]

  /** Discourse role for paragraph organization */
  discourseRole?: string

  /** Insertion position for sentence insertion */
  insertionPosition?: number
}

/**
 * Complete long-form explanation view model
 */
export interface LongFormExplainVM {
  /** Question type */
  kind: 'E2' | 'E3' | 'E4' | 'E5_DISCOURSE' | 'E5_INSERT'

  /** Passage with paragraphs */
  passage: PassageVM

  /** Questions array */
  questions: LongFormQuestionVM[]

  /** Overall translation (optional) */
  translation?: string

  /** Metadata */
  meta?: {
    conservative?: boolean
    parser?: {
      skip?: boolean
      reason?: string
    }
  }
}

/**
 * Evidence sync state for useEvidenceSync hook
 */
export interface EvidenceSyncState {
  /** Currently highlighted evidence spans */
  highlights: EvidenceSpan[]

  /** Current question ID being viewed */
  activeQuestionId?: string

  /** Jump to evidence and trigger highlight */
  jumpToEvidence: (spans: EvidenceSpan[], questionId?: string) => void

  /** Clear all highlights */
  clearHighlights: () => void
}

/**
 * Passage Dock configuration
 */
export interface PassageDockConfig {
  /** Storage key for remembering scroll position */
  storageKey?: string

  /** Maximum height (CSS value) */
  maxHeight?: string

  /** Enable keyboard shortcuts */
  enableKeyboard?: boolean

  /** Custom paragraph renderer */
  renderParagraph?: (para: PassageVM['paragraphs'][0], isHighlighted: boolean) => React.ReactNode
}

/**
 * Telemetry event types
 */
export type ReadingTelemetryEvent =
  | {
      type: 'explain.view'
      data: {
        kind: string
        questionCount: number
        source: 'api' | 'conservative'
        timeToFirstPaint?: number
      }
    }
  | {
      type: 'question.view'
      data: {
        kind: string
        qid: string
        index: number
      }
    }
  | {
      type: 'evidence.view'
      data: {
        kind: string
        qid: string
        paraId: string
        spans: number
      }
    }
  | {
      type: 'passage.scroll'
      data: {
        kind: string
        paraId: string
        scrollTop: number
      }
    }
    | {
      type: 'question.expand'
      data: {
        kind: string
        qid: string
        expanded: boolean
      }
    }
