import { chatCompletionJSON } from '@/lib/openai'
import { ExplainResultSchema, type ExplainResult, type SolveSubject } from '@/lib/solve-types'
import { z } from 'zod'

export const AURA_CONTRACT_VERSION = 'AuraExplain.v1'

export interface ParsedChoice {
  label: string
  text: string
}

const GENERATOR_SYSTEM_PROMPT = `You are the Aura-Edu VS³ Solver. Produce airtight, verifiable explanations.
Return STRICT JSON obeying the AuraExplain.v1 schema:
{
  "answer": "答案：...", // include選項標籤或文字
  "focus": "單一考點關鍵詞",
  "summary": "一句話解析",
  "one_line_reason": "10-20 字內的精煉理由",
  "confidence_badge": "high|medium|low",
  "steps": ["步驟1", "步驟2", "步驟3"],
  "details": ["詳解段落1", "詳解段落2"],
  "distractor_rejects": [
    { "option": "B", "reason": "排除理由" }
  ],
  "evidence_sentence": "直接引用或摘要證據",
  "tested_rule": "語法或概念名稱",
  "grammatical_focus": "語法焦點",
  "transition_word": "段落銜接詞",
  "before_after_fit": "解釋轉折語意",
  "native_upgrade": "較道地的進階寫法",
  "maws_scores": {
    "content": 0-5,
    "organization": 0-5,
    "sentence_structure": 0-5,
    "vocabulary": 0-5
  },
  "grammarTable": [
    { "category": "類別", "description": "說明", "example": "範例" }
  ],
  "encouragement": "暖心鼓勵"
}
Rules:
- Always output valid JSON. Omit fields by setting them to empty string or leaving them out ONLY if not applicable.
- one_line_reason MUST be <= 20 Chinese characters and summarize why the answer is correct.
- steps: 3-5 concise actions, no markdown.
- details: 1-4 paragraphs, no markdown bullets.
- When options exist, answer must include the correct label (A/B/C/D) and distractor_rejects MUST cover every other option once.
- evidence_sentence should quote or paraphrase the exact text span that proves the answer. If unavailable, use an empty string.
- tested_rule & grammatical_focus only when grammar/translation applies; otherwise empty string.
- transition_word & before_after_fit only when passage logic requires; otherwise empty string.
- native_upgrade & maws_scores only for writing/translation tasks; otherwise empty string / omit.
- Grammar table only for language subjects; max 3 rows.
- Never mention 延伸練習 or external links.`

const JUDGE_SYSTEM_PROMPT = `You are the Aura-Edu VS³ Judge. Audit the proposed explanation for rigor.
Return STRICT JSON:
{
  "approved": boolean,
  "issues": ["issue description"],
  "missing_fields": ["field"],
  "confidence": "high|medium|low"
}
Evaluation checklist:
1. Does the answer align with the question and cited evidence?
2. If options exist, are ALL incorrect options explained in distractor_rejects?
3. Does evidence_sentence genuinely support the answer? Flag if vague or missing when required.
4. Ensure one_line_reason is <= 20 chars and specific.
5. Steps & details must stay factual and match the question.
If unsure, set approved=false and explain why in issues.`

const JudgeResponseSchema = z.object({
  approved: z.boolean(),
  issues: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).optional().default([]),
  confidence: z.enum(['high', 'medium', 'low']).optional().default('medium'),
})

export type AuraJudgeReport = z.infer<typeof JudgeResponseSchema>

export interface AuraPipelineOutcome {
  explanation: ExplainResult | null
  judge: AuraJudgeReport | null
  approved: boolean
  attempts: number
  choices: ParsedChoice[]
  lastError?: string
}

export function extractChoices(questionText: string): ParsedChoice[] {
  const results: ParsedChoice[] = []
  const seen = new Set<string>()
  const normalized = questionText.replace(/\r/g, '')

  const patterns = [
    /\(([A-H])\)\s*([^()\n]+)/g,
    /([A-H])\.\s*([^\n]+)/g,
  ]

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalized)) !== null) {
      const label = match[1].trim().toUpperCase()
      if (seen.has(label)) continue
      const text = (match[2] ?? '').replace(/\s+/g, ' ').trim()
      if (!text) continue
      results.push({ label, text })
      seen.add(label)
    }
  }

  if (results.length >= 2) {
    return results
  }

  return results
}

export async function runAuraExplanationPipeline(
  questionText: string,
  subject: SolveSubject,
  { choices: providedChoices, maxAttempts = 3 }: { choices?: ParsedChoice[]; maxAttempts?: number } = {}
): Promise<AuraPipelineOutcome> {
  const choices = providedChoices && providedChoices.length > 0 ? providedChoices : extractChoices(questionText)
  let attempt = 0
  let lastJudge: AuraJudgeReport | null = null
  let lastExplanation: ExplainResult | null = null
  let lastError: string | undefined

  while (attempt < maxAttempts) {
    attempt += 1
    try {
      const explanation = await generateContract(questionText, subject, choices, lastJudge?.issues ?? [])
      lastExplanation = explanation
      const judge = await judgeContract(questionText, explanation, choices)
      lastJudge = judge
      if (judge.approved) {
        return { explanation, judge, approved: true, attempts: attempt, choices }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown generation error'
      console.error('[aura-contract] generation attempt failed:', lastError)
      lastJudge = {
        approved: false,
        issues: [`generation_error: ${lastError}`],
        missing_fields: [],
        confidence: 'low',
      }
    }
  }

  return { explanation: lastExplanation, judge: lastJudge, approved: false, attempts: attempt, choices, lastError }
}

async function generateContract(
  questionText: string,
  subject: SolveSubject,
  choices: ParsedChoice[],
  previousIssues: string[]
): Promise<ExplainResult> {
  const choiceLines =
    choices.length > 0
      ? choices.map((choice) => `${choice.label}. ${choice.text}`).join('\n')
      : '無選項或非選擇題'

  const remediation =
    previousIssues.length > 0
      ? `Judge flagged these issues previously: ${previousIssues.join('; ')}. Fix them strictly.`
      : 'No prior judge issues. Produce best-first answer.'

  const userPrompt = `Subject: ${subject}
Question:
${questionText.trim()}

Options:
${choiceLines}

${remediation}`

  const raw = await chatCompletionJSON<unknown>(
    [
      { role: 'system', content: GENERATOR_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { model: 'gpt-4o-mini', temperature: previousIssues.length > 0 ? 0.2 : 0.3 }
  )

  const parsed = ExplainResultSchema.parse(raw)
  return parsed
}

async function judgeContract(
  questionText: string,
  explanation: ExplainResult,
  choices: ParsedChoice[]
): Promise<AuraJudgeReport> {
  const structuralIssues = collectStructuralIssues(explanation, choices)
  if (structuralIssues.length > 0) {
    return {
      approved: false,
      issues: structuralIssues,
      missing_fields: [],
      confidence: 'low',
    }
  }

  const choiceLines =
    choices.length > 0
      ? choices.map((choice) => `${choice.label}. ${choice.text}`).join('\n')
      : '無明確選項'

  try {
    const response = await chatCompletionJSON<unknown>(
      [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Question:\n${questionText.trim()}\n\nOptions:\n${choiceLines}\n\nExplanation JSON:\n${JSON.stringify(explanation, null, 2)}`,
        },
      ],
      { model: 'gpt-4o-mini', temperature: 0 }
    )

    return JudgeResponseSchema.parse(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown judge error'
    console.error('[aura-contract] judge error:', message)
    return {
      approved: false,
      issues: [`judge_error: ${message}`],
      missing_fields: [],
      confidence: 'low',
    }
  }
}

function collectStructuralIssues(explanation: ExplainResult, choices: ParsedChoice[]): string[] {
  const issues: string[] = []

  if (!explanation.one_line_reason || explanation.one_line_reason.length === 0) {
    issues.push('one_line_reason_missing')
  } else if ([...explanation.one_line_reason].length > 20) {
    issues.push('one_line_reason_too_long')
  }

  if (!explanation.steps || explanation.steps.length < 3) {
    issues.push('steps_insufficient')
  }

  if (!explanation.details || explanation.details.length === 0) {
    issues.push('details_missing')
  }

  if (choices.length >= 2) {
    const answerLabel = extractAnswerLabel(explanation.answer)
    if (!answerLabel) {
      issues.push('answer_label_missing')
    } else {
      const expectedRejects = choices
        .map((choice) => choice.label)
        .filter((label) => label !== answerLabel)
      const provided = new Set(
        (explanation.distractor_rejects ?? []).map((reject) => reject.option.trim().toUpperCase())
      )
      for (const label of expectedRejects) {
        if (!provided.has(label)) {
          issues.push(`missing_distractor_reason_${label}`)
        }
      }
    }
  }

  return issues
}

function extractAnswerLabel(answer: string | undefined): string | null {
  if (!answer) return null
  const labelMatch = answer.match(/[A-H]/i)
  if (!labelMatch) return null
  return labelMatch[0].toUpperCase()
}
