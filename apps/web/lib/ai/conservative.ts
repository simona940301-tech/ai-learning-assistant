/**
 * Conservative Mode Orchestrator
 * Self-diagnoses and generates structured explanations
 */
import { detectConservativeType } from './conservative-detector'
import { generateConservativeExplanation } from './conservative-explainer'
import type { ConservativeResult, ConservativeQuestionType } from './conservative-types'

export async function runConservativeMode(inputText: string): Promise<ConservativeResult> {
  console.log('[ConservativeMode] Starting self-diagnosis and explanation generation')

  // Step 1: Self-diagnose question type
  const detectedType = await detectConservativeType(inputText)

  // Step 2: Generate structured explanation
  const answer = await generateConservativeExplanation(inputText, detectedType)

  // Step 3: Determine confidence (basic heuristic)
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  if (detectedType === 'E1_VOCAB') {
    confidence = 'high'
  } else if (detectedType === 'E4_READING' || detectedType === 'E6_WRITING') {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  console.log(`[ConservativeMode] Completed: type=${detectedType}, confidence=${confidence}`)

  return {
    detected_type: detectedType,
    answer,
    confidence,
  }
}
