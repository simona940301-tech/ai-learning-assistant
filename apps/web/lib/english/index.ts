import type { EnglishQuestionInput, EnglishExplanationResult } from '@/lib/contracts/explain'
import { classifyEnglishType } from './router'
import { generateTemplateCard } from './templates'
import { extractVocab } from './vocab-extractor'
import { validateCard } from './validators'
import { generateFallbackCard } from './fallback'

/**
 * Main orchestrator for English explanation pipeline
 * 
 * Flow:
 * 1. Classify question type (E1-E5 or FALLBACK)
 * 2. Generate template-based card
 * 3. Extract vocabulary hints
 * 4. Validate completeness & alignment
 * 5. Return card + routing info (or fallback if validation fails)
 */
export async function orchestrateEnglishExplanation(
  input: EnglishQuestionInput
): Promise<EnglishExplanationResult> {
  const startTime = Date.now()
  
  try {
    // Step 1: Route question type
    console.log('[explain_pipeline] Starting English type classification...')
    const route = await classifyEnglishType(input)
    
    console.log('[explain_pipeline] Type classified:', {
      type: route.type,
      confidence: route.confidence,
      signals: route.signals,
      reason: route.reason,
    })
    
    // Telemetry
    console.log('[event] explain_pipeline_routed', {
      type: route.type,
      confidence: route.confidence,
      signals: route.signals,
      len_stem: input.stem.length,
      len_options: input.options.length,
      elapsed_ms: Date.now() - startTime,
    })
    
    // Step 2 & 3: Generate template card AND extract vocabulary IN PARALLEL (optimization)
    console.log('[explain_pipeline] Generating template card and extracting vocab in parallel...')
    const [cardDraft, vocab] = await Promise.all([
      generateTemplateCard({
        route,
        stem: input.stem,
        options: input.options,
        meta: input.meta,
      }),
      extractVocab(input), // With timeout protection
    ])
    
    cardDraft.vocab = vocab
    
    console.log('[explain_pipeline] Card generated and vocab extracted:', vocab.length, 'items')
    
    // Step 4: Validate card (simplified - only critical checks)
    console.log('[explain_pipeline] Validating card...')
    const validated = validateCard(cardDraft, input)

    // Only fallback if validation has critical issues
    // Allow partial success if card has minimal required fields
    if (!validated.ok) {
      console.warn('[explain_pipeline] Validation issues found:', validated.issues)

      // Check if issues are critical (schema failure, subject labels)
      const hasCriticalIssues = validated.issues.some(issue =>
        issue.includes('Schema validation failed') ||
        issue.includes('subject label')
      )

      if (hasCriticalIssues) {
        console.warn('[explain_pipeline] Critical validation failure, falling back')
        console.log('[event] explain_pipeline_fallback', {
          reason: 'critical_validation_failed',
          issues: validated.issues,
          original_type: route.type,
        })

        // Generate fallback card
        const fallbackCard = await generateFallbackCard(input)
        fallbackCard.vocab = vocab // Keep vocab

        return {
          card: fallbackCard,
          routing: { ...route, type: 'FALLBACK', confidence: 0.5 },
          issues: validated.issues,
        }
      }

      // Non-critical issues: proceed with card but log warnings
      console.log('[explain_pipeline] ⚠️ Proceeding with partial card (has minimal fields)')
    }
    
    // Success
    const totalTime = Date.now() - startTime
    console.log('[explain_pipeline] ✅ Card validated successfully in', totalTime, 'ms')
    console.log('[event] explain_card_generated', {
      kind: validated.card.kind,
      has_vocab: validated.card.vocab.length > 0,
      option_count: validated.card.options.length,
      elapsed_ms: totalTime,
    })
    
    return {
      card: validated.card,
      routing: route,
    }
  } catch (error) {
    console.error('[explain_pipeline] Critical error:', error)
    
    // Emergency fallback
    console.log('[event] explain_pipeline_fallback', {
      reason: 'critical_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    const emergencyCard = await generateFallbackCard(input)
    
    return {
      card: emergencyCard,
      routing: {
        type: 'FALLBACK',
        confidence: 0.3,
        signals: ['emergency_fallback'],
        reason: 'Critical error in pipeline',
      },
      issues: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

