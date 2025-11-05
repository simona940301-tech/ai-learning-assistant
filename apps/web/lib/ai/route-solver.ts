import { createHash } from 'crypto'
import type { ExplainResult, SolveSubject } from '@/lib/solve-types'
import { runHardGuard } from './hard-guard'
import { probeExperts, type ExpertProbe } from './experts'
import { buildMockExplanation } from './mock-explanation'
import {
  runAuraExplanationPipeline,
  AURA_CONTRACT_VERSION,
  extractChoices,
  type AuraJudgeReport,
} from './aura-contract'

const DEFAULT_CONFIG = {
  ExpertThreshold: 0.55,
  PickTopK: 1,
  EnableKeyboardShortcuts: true,
} as const

type SubjectHint = 'english' | 'math' | 'chinese' | 'social' | 'science' | 'unknown'

export interface HybridSolveResponse {
  explanation: ExplainResult
  meta: {
    questionId: string
    guard: ReturnType<typeof runHardGuard>
    experts: ExpertProbe[]
    chosen: ExpertProbe[]
    subjectHint: SubjectHint
    retrieval: {
      baseQuery: string
      tags: string[]
      searchQuery: string
    }
    config: typeof DEFAULT_CONFIG
    reason: string
    fallback: boolean
    fallback_reason?: string
    contractVersion: string
    contractAttempts: number
    judge: AuraJudgeReport | null
    choices: ReturnType<typeof extractChoices>
  }
}

export async function runHybridSolve(questionText: string): Promise<HybridSolveResponse> {
  const guard = runHardGuard(questionText)
  const experts = probeExperts(questionText)

  const chosen = pickExperts(experts, DEFAULT_CONFIG.ExpertThreshold, DEFAULT_CONFIG.PickTopK)
  const reason = chosen[0]?.notes || chosen[0]?.tags.join('/') || 'general'
  const subjectHint = deriveSubjectHint(guard.subject, chosen)
  const parsedChoices = extractChoices(questionText)

  let fallbackUsed = false
  let fallbackReason: string | undefined
  let judgeReport: AuraJudgeReport | null = null
  let contractAttempts = 0
  let explanation: ExplainResult
  try {
    const contractSubject = subjectHint as SolveSubject
    const pipeline = await runAuraExplanationPipeline(questionText, contractSubject, { choices: parsedChoices })
    judgeReport = pipeline.judge ?? null
    contractAttempts = pipeline.attempts

    if (pipeline.explanation && pipeline.approved) {
      explanation = pipeline.explanation
    } else {
      fallbackUsed = true
      fallbackReason = pipeline.lastError
        ? `pipeline_error:${pipeline.lastError}`
        : pipeline.judge?.issues?.join('|') || 'judge_rejected'
      explanation = buildMockExplanation(questionText, contractSubject, parsedChoices)
    }
  } catch (error) {
    console.error('[hybrid-solve] OpenAI generate failed, using fallback:', error)
    fallbackUsed = true
    fallbackReason = error instanceof Error ? `exception:${error.message}` : 'unknown_exception'
    explanation = buildMockExplanation(questionText, subjectHint as SolveSubject, parsedChoices)
  }

  const refined = refineExplanation(explanation, chosen)
  const retrieval = buildRetrieval(questionText, chosen)
  const questionId = hashQuestion(questionText)

  const tagSummary = chosen.flatMap((c) => c.tags).join('/') || 'general'
  const logLine = `✅ Guard: hard=${guard.subject}, experts=[${experts
    .map((e) => `${e.subject}:${e.confidence.toFixed(2)}`)
    .join(',')}], chosen=${chosen.map((c) => c.subject).join('/') || 'general'}, tags=[${tagSummary}], reason="${reason}"`
  console.log(logLine)
  console.log('✅ Subject detection validated:', subjectHint)
  if (fallbackUsed) {
    console.warn('[hybrid-solve] Returned mock explanation due to upstream failure')
  }

  return {
    explanation: refined,
    meta: {
      questionId,
      guard,
      experts,
      chosen,
      subjectHint,
      retrieval,
      config: DEFAULT_CONFIG,
      reason,
      fallback: fallbackUsed,
      fallback_reason: fallbackReason,
      contractVersion: AURA_CONTRACT_VERSION,
      contractAttempts,
      judge: judgeReport,
      choices: parsedChoices,
    },
  }
}

function pickExperts(experts: ExpertProbe[], threshold: number, pickTopK: number): ExpertProbe[] {
  const filtered = experts.filter((expert) => expert.confidence >= threshold)
  if (filtered.length === 0) return []
  return filtered.slice(0, pickTopK)
}

function refineExplanation(explanation: ExplainResult, chosen: ExpertProbe[]): ExplainResult {
  if (chosen.length === 0) return explanation

  const primary = chosen[0]
  const augmentedSummary =
    primary.confidence > 0.7 ? `【${primary.subject.toUpperCase()}】${explanation.summary}` : explanation.summary
  const injectedDetail =
    primary.notes && !explanation.details[0]?.includes(primary.notes)
      ? [`專家補充：${primary.notes}`, ...explanation.details].slice(0, 4)
      : explanation.details

  const grammarTable =
    explanation.grammarTable && explanation.grammarTable.length > 3
      ? explanation.grammarTable.slice(0, 3)
      : explanation.grammarTable

  return {
    ...explanation,
    summary: augmentedSummary,
    details: injectedDetail,
    grammarTable,
  }
}

function buildRetrieval(questionText: string, chosen: ExpertProbe[]) {
  const baseQuery = questionText.replace(/\s+/g, ' ').trim().slice(0, 200)
  const tags = Array.from(new Set(chosen.flatMap((c) => c.tags))).slice(0, 5)
  const searchQuery =
    baseQuery.length === 0
      ? tags.join(',') || 'general'
      : `${baseQuery} | tags:${tags.join(',') || 'general'}`
  return { baseQuery, tags, searchQuery }
}

function deriveSubjectHint(hard: 'math' | 'none', chosen: ExpertProbe[]): SubjectHint {
  if (hard === 'math') return 'math'
  if (chosen.length === 0) return 'unknown'
  const subject = chosen[0].subject
  if (subject === 'english' || subject === 'math' || subject === 'chinese' || subject === 'social' || subject === 'science') {
    return subject
  }
  return 'unknown'
}

function hashQuestion(questionText: string): string {
  return createHash('sha1').update(questionText).digest('hex')
}
