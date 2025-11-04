'use client'

import type { ReadingQuestionVM } from '@/lib/mapper/explain-presenter'

interface ErrorAwareExplanationProps {
  question: ReadingQuestionVM
  answerLetter?: string
  answerText?: string
}

/**
 * 🎯 S1: Smart Error-aware Explanation
 * Adaptive reasoning display based on question type
 * - Single line for detail questions
 * - Multi-step for inference questions
 * - Context-aware for vocabulary
 * - Main idea summary for main questions
 */
export function ErrorAwareExplanation({ question, answerLetter, answerText }: ErrorAwareExplanationProps) {
  const reasoningSteps = question.reasoningSteps || []
  const commonMistake = question.meta.commonMistake || ''

  // Show correct answer (always compact)
  const correctAnswer = answerLetter && answerText
    ? `${answerLetter} — ${answerText.substring(0, 60)}${answerText.length > 60 ? '...' : ''}`
    : answerLetter || ''

  // If no content, don't render
  if (reasoningSteps.length === 0 && !commonMistake && !correctAnswer) return null

  return (
    <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-sm">
      {/* 🧠 解題思路 - Adaptive rendering */}
      {reasoningSteps.length > 0 && (
        <div className="space-y-1">
          <div className="font-medium text-muted-foreground">🧠 解題思路</div>
          {reasoningSteps.length === 1 ? (
            // Single line for detail/vocabulary/main
            <p className="text-sm leading-relaxed text-zinc-200 dark:text-zinc-200">
              {reasoningSteps[0]}
            </p>
          ) : (
            // Multi-step for inference (with emoji prefixes like 1️⃣, ✅)
            <div className="space-y-1">
              {reasoningSteps.map((step, idx) => (
                <p key={idx} className="text-sm leading-relaxed text-zinc-200 dark:text-zinc-200">
                  {step}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ⚠️ Common Pitfall (if exists) */}
      {commonMistake && (
        <div>
          <span className="font-medium text-muted-foreground">⚠️ 陷阱：</span>
          <span className="text-amber-700 dark:text-amber-300">{commonMistake}</span>
        </div>
      )}

      {/* ✅ Correct Answer (always shown if available) */}
      {correctAnswer && (
        <div>
          <span className="font-medium text-muted-foreground">✅ 答案：</span>
          <span className="font-medium text-green-700 dark:text-green-300">{correctAnswer}</span>
        </div>
      )}
    </div>
  )
}

