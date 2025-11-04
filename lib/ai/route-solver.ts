import { createHash } from 'crypto'
import { chatCompletionJSON } from '@/lib/openai'
import { ExplainResultSchema, type ExplainResult } from '@/lib/solve-types'
import { runHardGuard } from './hard-guard'
import { probeExperts, type ExpertProbe } from './experts'

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
  }
}

const GENERAL_SOLVER_PROMPT = `You are an Any-Subject GSAT tutor. Produce concise, scannable JSON with four sections.

JSON schema:
{
  "answer": "答案：...",
  "focus": "考點關鍵詞（最短名詞片語）",
  "summary": "一句話解析 (<= 24 字)",
  "steps": ["1...", "2...", "3..."],
  "details": ["段落1", "段落2", "段落3", "段落4?"],
  "grammarTable": [
    { "category": "類別", "description": "說明", "example": "範例" }
  ],
  "encouragement": "可選，簡短加油句"
}

Rules:
- steps: 3-5 items, each < 50 characters.
- details: 2-4 short paragraphs, no markdown, no numbering.
- grammarTable: only when language cues exist; max 3 rows.
- Never mention 延伸練習 or external links.`

export async function runHybridSolve(questionText: string): Promise<HybridSolveResponse> {
  const guard = runHardGuard(questionText)
  const experts = probeExperts(questionText)

  const chosen = pickExperts(experts, DEFAULT_CONFIG.ExpertThreshold, DEFAULT_CONFIG.PickTopK)
  const reason = chosen[0]?.notes || chosen[0]?.tags.join('/') || 'general'
  const subjectHint = deriveSubjectHint(guard.subject, chosen)

  const explanation = await generateGeneralSolution(questionText)
  const refined = refineExplanation(explanation, chosen)
  const retrieval = buildRetrieval(questionText, chosen)
  const questionId = hashQuestion(questionText)

  const tagSummary = chosen.flatMap((c) => c.tags).join('/') || 'general'
  const logLine = `✅ Guard: hard=${guard.subject}, experts=[${experts
    .map((e) => `${e.subject}:${e.confidence.toFixed(2)}`)
    .join(',')}], chosen=${chosen.map((c) => c.subject).join('/') || 'general'}, tags=[${tagSummary}], reason="${reason}"`
  console.log(logLine)
  console.log('✅ Subject detection validated:', subjectHint)

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
    },
  }
}

function pickExperts(experts: ExpertProbe[], threshold: number, pickTopK: number): ExpertProbe[] {
  const filtered = experts.filter((expert) => expert.confidence >= threshold)
  if (filtered.length === 0) return []
  return filtered.slice(0, pickTopK)
}

async function generateGeneralSolution(questionText: string): Promise<ExplainResult> {
  const prompt = `Question:\n${questionText}\n\nGeneral explanation requested.`
  const result = await chatCompletionJSON<ExplainResult>(
    [
      { role: 'system', content: GENERAL_SOLVER_PROMPT },
      { role: 'user', content: prompt },
    ],
    { model: 'gpt-4o-mini', temperature: 0.35 }
  )
  return ExplainResultSchema.parse(result)
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
