/**
 * Explain Executor
 * Generates detailed step-by-step solution for a question
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExplainResultSchema, SolveSubjectSchema, type ExplainResult, type SolveSubject } from '@/lib/solve-types'
import { z } from 'zod'
import { buildMockExplanation } from '@/lib/ai/mock-explanation'
import {
  runAuraExplanationPipeline,
  AURA_CONTRACT_VERSION,
  extractChoices,
  type AuraJudgeReport,
} from '@/lib/ai/aura-contract'

const RequestSchema = z.object({
  questionText: z.string().min(1),
  subject: SolveSubjectSchema,
})

const DEFAULT_CHOICES = ['選項A', '選項B', '選項C', '選項D']

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let parsedInput: z.infer<typeof RequestSchema> | null = null

  try {
    const body = await request.json()
    parsedInput = RequestSchema.parse(body)
    const { questionText, subject } = parsedInput

    console.log('[exec/explain] question:', questionText.substring(0, 100), 'subject:', subject)

    const parsedChoices = extractChoices(questionText)

    let fallbackUsed = false
    let fallbackReason: string | undefined
    let judgeReport: AuraJudgeReport | null = null
    let contractAttempts = 0
    let explanation: ExplainResult | null = null

    try {
      const pipeline = await runAuraExplanationPipeline(questionText, subject, { choices: parsedChoices })
      judgeReport = pipeline.judge ?? null
      contractAttempts = pipeline.attempts

      if (pipeline.explanation && pipeline.approved) {
        explanation = pipeline.explanation
      } else {
        fallbackUsed = true
        fallbackReason = pipeline.lastError
          ? `pipeline_error:${pipeline.lastError}`
          : pipeline.judge?.issues?.join('|') || 'judge_rejected'
      }
    } catch (error) {
      console.error('[exec/explain] pipeline error:', error)
      fallbackUsed = true
      fallbackReason = error instanceof Error ? `exception:${error.message}` : 'unknown_exception'
    }

    if (!explanation) {
      explanation = buildMockExplanation(questionText, subject, parsedChoices)
    }

    const validated = ExplainResultSchema.parse(explanation)
    const normalizedChoices = buildChoiceTexts(parsedChoices)
    const questionSet = buildQuestionSetPayload(questionText, validated, subject, normalizedChoices)

    const latency = Date.now() - startTime
    console.log('[exec/explain] generated in', latency, 'ms')

    return NextResponse.json({
      ...questionSet,
      _meta: {
        latency_ms: latency,
        fallback: fallbackUsed,
        fallback_reason: fallbackReason,
        subject,
        contractVersion: AURA_CONTRACT_VERSION,
        contractAttempts,
        judge: judgeReport,
      },
    })
  } catch (error) {
    console.error('[exec/explain] error:', error)
    const latency = Date.now() - startTime

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          message: 'Invalid explain request payload',
          details: error.issues,
          _meta: { latency_ms: latency },
        },
        { status: 400 }
      )
    }

    const subject: SolveSubject = parsedInput?.subject ?? 'unknown'
    const questionText = parsedInput?.questionText ?? ''
    const fallbackChoices = extractChoices(questionText)
    const fallbackExplanation = buildMockExplanation(questionText, subject, fallbackChoices)
    const validated = ExplainResultSchema.parse(fallbackExplanation)
    const questionSet = buildQuestionSetPayload(
      questionText,
      validated,
      subject,
      buildChoiceTexts(fallbackChoices)
    )

    return NextResponse.json({
      ...questionSet,
      _meta: {
        latency_ms: latency,
        fallback: true,
        fallback_reason: error instanceof Error ? `exception:${error.message}` : 'unknown_exception',
        subject,
        contractVersion: AURA_CONTRACT_VERSION,
        contractAttempts: 0,
        judge: null,
      },
    })
  }
}

function buildChoiceTexts(choices: ReturnType<typeof extractChoices>): string[] {
  if (choices.length >= 2) {
    return choices.map((choice, index) => {
      const trimmed = choice.text.trim()
      return trimmed.length > 0 ? trimmed : `選項${String.fromCharCode(65 + index)}`
    })
  }
  return [...DEFAULT_CHOICES]
}

function extractAnswerLabel(answer: string): string | undefined {
  const match = answer.match(/[A-H]/i)
  return match ? match[0].toUpperCase() : undefined
}

function buildQuestionSetPayload(
  questionText: string,
  explanation: ExplainResult,
  subject: SolveSubject,
  choices: string[]
) {
  const answerLabel = extractAnswerLabel(explanation.answer)

  return {
    type: 'E0_QUESTION_SET' as const,
    source_context: 'exec.explain',
    questions: [
      {
        qid: 1,
        kind: 'unknown',
        stem: questionText,
        choices: choices.length >= 2 ? choices : DEFAULT_CHOICES,
        answer: explanation.answer,
        answer_label: answerLabel,
        one_line_reason: explanation.one_line_reason,
        distractor_rejects: explanation.distractor_rejects ?? [],
        meta: {
          subject,
          focus: explanation.focus,
          summary: explanation.summary,
          steps: explanation.steps,
          details: explanation.details,
          confidence_badge: explanation.confidence_badge,
          contract_version: AURA_CONTRACT_VERSION,
          contract: explanation,
          evidence_sentence: explanation.evidence_sentence,
          tested_rule: explanation.tested_rule,
          grammatical_focus: explanation.grammatical_focus,
          transition_word: explanation.transition_word,
          before_after_fit: explanation.before_after_fit,
          native_upgrade: explanation.native_upgrade,
          maws_scores: explanation.maws_scores,
          encouragement: explanation.encouragement,
          grammarTable: explanation.grammarTable,
        },
      },
    ],
  }
}
