/**
 * Contract v2: Unified Response Schema for Ask-AI System
 *
 * All core endpoints (detect, warmup, answer, solve) return a consistent structure
 * that supports the entire flow from question detection to detailed explanation.
 */

// ========================================
// Core Domain Types
// ========================================

export type Subject =
  | 'Chinese' | 'English' | 'MathA' | 'MathB'
  | 'Physics' | 'Chemistry' | 'Biology' | 'Earth'
  | 'History' | 'Geography' | 'Civics'
  | 'unknown'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Phase = 'detect' | 'warmup' | 'answer' | 'solve'

// ========================================
// Contract v2 Response Structure
// ========================================

/**
 * Unified response contract for all Ask-AI endpoints
 */
export interface ContractV2Response {
  // Core identifiers
  phase: Phase
  session_id?: string
  question_id?: string

  // Subject classification
  subject: Subject
  subject_confidence: number // 0-1
  subject_alternatives?: Array<{
    subject: Subject
    confidence: number
  }>

  // Keypoint/concept identification
  keypoint?: {
    id: string
    code: string
    name: string
    category?: string
  }

  // Question data
  question?: {
    stem: string
    options?: Array<{
      id: string
      label: string
      is_correct?: boolean
    }>
  }

  // Explanation/solution (populate in solve phase)
  explanation?: {
    summary: string // One-sentence concept summary
    steps: string[] // Solution steps (3-5 items)
    grammar_table?: Array<{
      category: string
      description: string
      example: string
    }>
    checks: string[] // Verification checklist
    error_hints: string[] // Common mistakes
    extensions: string[] // Related concepts
  }

  // Answer judgment (populate in answer phase)
  judge?: {
    user_answer: string
    expected_answer: string | null
    is_correct: boolean
    rationale: string | null
  }

  // UI control flags
  ui?: {
    show_warmup: boolean
    show_explanation: boolean
    enable_save: boolean
    enable_retry: boolean
  }

  // Telemetry
  telemetry?: {
    latency_ms: number
    model_used?: string
    tokens_used?: number
  }

  // Debug information (only in dev/debug mode)
  debug?: {
    raw_input?: string
    detection_details?: Record<string, unknown>
    errors?: string[]
  }
}

// ========================================
// Response Builders (helpers for endpoints)
// ========================================

export function createDetectResponse(
  subject: Subject,
  confidence: number,
  options?: {
    session_id?: string
    alternatives?: Array<{ subject: Subject; confidence: number }>
    debug?: Record<string, unknown>
  }
): ContractV2Response {
  return {
    phase: 'detect',
    session_id: options?.session_id,
    subject,
    subject_confidence: confidence,
    subject_alternatives: options?.alternatives,
    debug: options?.debug ? { detection_details: options.debug } : undefined,
  }
}

export function createWarmupResponse(
  session_id: string,
  subject: Subject,
  keypoint: { id: string; code: string; name: string; category?: string },
  question: {
    stem: string
    options: Array<{ id: string; label: string; is_correct?: boolean }>
  },
  options?: {
    confidence?: number
    telemetry?: ContractV2Response['telemetry']
  }
): ContractV2Response {
  return {
    phase: 'warmup',
    session_id,
    subject,
    subject_confidence: options?.confidence ?? 0.8,
    keypoint,
    question,
    ui: {
      show_warmup: true,
      show_explanation: false,
      enable_save: false,
      enable_retry: false,
    },
    telemetry: options?.telemetry,
  }
}

export function createAnswerResponse(
  session_id: string,
  subject: Subject,
  judge: {
    user_answer: string
    expected_answer: string | null
    is_correct: boolean
    rationale: string | null
  },
  options?: {
    keypoint?: ContractV2Response['keypoint']
    telemetry?: ContractV2Response['telemetry']
  }
): ContractV2Response {
  return {
    phase: 'answer',
    session_id,
    subject,
    subject_confidence: 1.0, // Already determined in warmup
    keypoint: options?.keypoint,
    judge,
    ui: {
      show_warmup: false,
      show_explanation: true,
      enable_save: false,
      enable_retry: false,
    },
    telemetry: options?.telemetry,
  }
}

export function createSolveResponse(
  session_id: string,
  subject: Subject,
  keypoint: { id: string; code: string; name: string; category?: string },
  explanation: {
    summary: string
    steps: string[]
    grammar_table?: Array<{ category: string; description: string; example: string }>
    checks: string[]
    error_hints: string[]
    extensions: string[]
  },
  options?: {
    difficulty?: Difficulty
    past_papers?: Array<{
      id: string
      stem: string
      tags: string[]
    }>
    telemetry?: ContractV2Response['telemetry']
  }
): ContractV2Response {
  return {
    phase: 'solve',
    session_id,
    subject,
    subject_confidence: 1.0,
    keypoint,
    explanation: {
      ...explanation,
      // Attach past papers as extensions if provided
      extensions: [
        ...explanation.extensions,
        ...(options?.past_papers?.map(p => `歷屆試題: ${p.stem.substring(0, 50)}...`) ?? []),
      ],
    },
    ui: {
      show_warmup: false,
      show_explanation: true,
      enable_save: true,
      enable_retry: true,
    },
    telemetry: options?.telemetry,
  }
}

// ========================================
// Validation & Type Guards
// ========================================

export function isValidPhase(phase: string): phase is Phase {
  return ['detect', 'warmup', 'answer', 'solve'].includes(phase)
}

export function isValidSubject(subject: string): subject is Subject {
  const validSubjects = [
    'Chinese', 'English', 'MathA', 'MathB',
    'Physics', 'Chemistry', 'Biology', 'Earth',
    'History', 'Geography', 'Civics', 'unknown',
  ]
  return validSubjects.includes(subject)
}

export function validateContractV2(response: unknown): response is ContractV2Response {
  if (!response || typeof response !== 'object') return false

  const r = response as Partial<ContractV2Response>

  // Required fields
  if (!r.phase || !isValidPhase(r.phase)) return false
  if (!r.subject || !isValidSubject(r.subject)) return false
  if (typeof r.subject_confidence !== 'number') return false
  if (r.subject_confidence < 0 || r.subject_confidence > 1) return false

  return true
}

// ========================================
// Legacy Adapters (for backward compatibility)
// ========================================

/**
 * Adapts old WarmupResponse to Contract v2
 */
export function adaptLegacyWarmup(legacy: {
  phase: string
  subject: string
  confidence: number
  detected_keypoint: string
  session_id: string
  stem: string
  options: Array<{ option_id: string; label: string }>
  answer_index?: number
}): ContractV2Response {
  return createWarmupResponse(
    legacy.session_id,
    legacy.subject as Subject,
    {
      id: legacy.detected_keypoint,
      code: legacy.detected_keypoint,
      name: legacy.detected_keypoint.replace(/_/g, ' '),
    },
    {
      stem: legacy.stem,
      options: legacy.options.map((opt, idx) => ({
        id: opt.option_id,
        label: opt.label,
        is_correct: idx === (legacy.answer_index ?? -1),
      })),
    },
    { confidence: legacy.confidence }
  )
}

/**
 * Adapts old SolveResponse to Contract v2
 */
export function adaptLegacySolve(
  legacy: {
    subject: string
    confidence: number
    detected_keypoint: string
    phase: string
    summary: string
    steps: string[]
    checks: string[]
    error_hints: string[]
    extensions: string[]
  },
  session_id: string
): ContractV2Response {
  return createSolveResponse(
    session_id,
    legacy.subject as Subject,
    {
      id: legacy.detected_keypoint,
      code: legacy.detected_keypoint,
      name: legacy.detected_keypoint.replace(/_/g, ' '),
    },
    {
      summary: legacy.summary,
      steps: legacy.steps,
      checks: legacy.checks,
      error_hints: legacy.error_hints,
      extensions: legacy.extensions,
    }
  )
}
