/**
 * Micro-hints System
 *
 * Provides progressive hints for struggling users without giving away the answer
 * Uses a 3-tier hint system: Strategic -> Conceptual -> Eliminative
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface HintRequest {
  questionText: string
  options: string[]
  correctAnswer: string
  subject: string
  conceptTags: string[]
  userAttempts?: number
  previousHints?: string[]
}

export interface HintResponse {
  level: 1 | 2 | 3
  hint: string
  hintType: 'strategic' | 'conceptual' | 'eliminative'
  shouldRevealAnswer: boolean
}

/**
 * Generate a micro-hint based on user's struggle level
 *
 * Level 1 (Strategic): General problem-solving strategy, no specific answer guidance
 * Level 2 (Conceptual): Explains the concept needed, still doesn't point to answer
 * Level 3 (Eliminative): Helps eliminate wrong answers, guides toward correct one
 */
export async function generateHint(request: HintRequest): Promise<HintResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }) // ⚡ Use 2.5 Flash

    // Determine hint level based on attempts
    const attempts = request.userAttempts || 0
    let level: 1 | 2 | 3
    let hintType: 'strategic' | 'conceptual' | 'eliminative'

    if (attempts === 0) {
      level = 1
      hintType = 'strategic'
    } else if (attempts === 1 || (request.previousHints && request.previousHints.length === 1)) {
      level = 2
      hintType = 'conceptual'
    } else {
      level = 3
      hintType = 'eliminative'
    }

    const prompt = generateHintPrompt(request, level)

    const result = await model.generateContent(prompt)
    const hint = result.response.text().trim()

    // After 3 attempts, suggest revealing the answer
    const shouldRevealAnswer = attempts >= 3

    return {
      level,
      hint,
      hintType,
      shouldRevealAnswer
    }

  } catch (error) {
    console.error('[Micro-hints] Error generating hint:', error)
    throw new Error('Failed to generate hint')
  }
}

function generateHintPrompt(request: HintRequest, level: number): string {
  const baseContext = `You are a supportive tutor helping a student solve a ${request.subject} question.

**Question**: ${request.questionText}

**Options**:
A) ${request.options[0]}
B) ${request.options[1]}
C) ${request.options[2]}
D) ${request.options[3]}

**Concept Tags**: ${request.conceptTags.join(', ')}

${request.previousHints && request.previousHints.length > 0 ? `**Previous Hints Given**:\n${request.previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n` : ''}`

  if (level === 1) {
    return `${baseContext}

**Your Task**: Provide a LEVEL 1 STRATEGIC hint.

**Requirements**:
- Give a general problem-solving strategy for this type of question
- Help the student understand what approach to take
- DO NOT mention any specific option (A, B, C, D)
- DO NOT reveal which answer is correct
- Keep it brief (1-2 sentences)
- Focus on the thinking process, not the answer

**Example Level 1 Hints**:
- "Look for the verb tense in the first clause, then make sure the second clause matches."
- "Start by identifying the subject of the sentence, then check if the verb agrees with it."
- "Consider what the question is asking - is it about the main idea or a specific detail?"

Generate a Level 1 strategic hint now:`
  }

  if (level === 2) {
    return `${baseContext}

**Your Task**: Provide a LEVEL 2 CONCEPTUAL hint.

**Requirements**:
- Explain the key concept needed to solve this question
- Help the student understand the underlying principle
- DO NOT point to a specific option as correct
- You MAY mention what makes options wrong in general terms
- Keep it concise (2-3 sentences)
- Focus on understanding, not elimination

**Example Level 2 Hints**:
- "This question tests subject-verb agreement. Remember that singular subjects take singular verbs, and 'each' is always singular, even when followed by 'of' and a plural noun."
- "The key is understanding parallel structure. When items are in a list or comparison, they must be in the same grammatical form."

Generate a Level 2 conceptual hint now:`
  }

  // Level 3
  return `${baseContext}

**Your Task**: Provide a LEVEL 3 ELIMINATIVE hint.

**Requirements**:
- Help eliminate obviously wrong answers
- Guide the student toward the correct answer without stating it directly
- You MAY mention specific options (A, B, C, D) and why they might be wrong
- Still let the student make the final choice
- Be specific but not too obvious
- Keep it helpful (2-3 sentences)

**Example Level 3 Hints**:
- "Options A and C can be eliminated because they both use plural verbs, but the subject is singular. Between B and D, consider which one maintains parallel structure with the rest of the sentence."
- "Option D contradicts information in the second paragraph. Option A is too extreme with the word 'always'. Between B and C, look at which one matches the author's tone."

Generate a Level 3 eliminative hint now:`
}

/**
 * Get a quick hint based on response time (for real-time hints during PVE)
 */
export async function getQuickHint(
  questionText: string,
  conceptTags: string[],
  timeSpentSeconds: number
): Promise<string | null> {
  // Only show hints if user is struggling (spent > 15 seconds)
  if (timeSpentSeconds < 15) {
    return null
  }

  const hints = {
    'tense-consistency': 'Check if all verbs in the sentence use the same tense',
    'subject-verb-agreement': 'Find the subject first, then match the verb to it',
    'pronoun-reference': 'Make sure each pronoun clearly refers to a specific noun',
    'parallel-structure': 'Items in a list should have the same grammatical form',
    'main-idea': 'Look for the sentence or phrase that appears most frequently',
    'inference': 'The answer should be supported by the text, not require outside knowledge',
    'vocabulary-in-context': 'Read the sentence before and after to understand the word\'s meaning',
    'author-purpose': 'Consider why the author wrote this - to inform, persuade, or entertain?',

    // Math
    'quadratic-equations': 'Try factoring or using the quadratic formula',
    'linear-equations': 'Isolate the variable step by step',
    'geometry-angles': 'Remember that angles in a triangle sum to 180°',
    'probability': 'Count favorable outcomes divided by total possible outcomes',
    'ratios-proportions': 'Set up a proportion and cross multiply',
    'algebraic-expressions': 'Combine like terms first, then simplify'
  }

  // Find matching concept
  for (const tag of conceptTags) {
    if (hints[tag as keyof typeof hints]) {
      return hints[tag as keyof typeof hints]
    }
  }

  return null
}

/**
 * Track hint effectiveness
 */
export async function trackHintUsage(
  userId: string,
  questionId: string,
  hint: HintResponse,
  wasHelpful: boolean,
  supabase: any
): Promise<void> {
  try {
    await supabase.from('hint_usage_logs').insert({
      user_id: userId,
      question_id: questionId,
      hint_level: hint.level,
      hint_type: hint.hintType,
      was_helpful: wasHelpful,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Micro-hints] Failed to track hint usage:', error)
  }
}

/**
 * Analyze hint effectiveness for a user
 */
export async function analyzeHintEffectiveness(
  userId: string,
  supabase: any
): Promise<{
  totalHints: number
  helpfulHints: number
  effectiveness: number
  mostHelpfulType: string
}> {
  try {
    const { data: hintLogs } = await supabase
      .from('hint_usage_logs')
      .select('hint_type, was_helpful')
      .eq('user_id', userId)

    if (!hintLogs || hintLogs.length === 0) {
      return {
        totalHints: 0,
        helpfulHints: 0,
        effectiveness: 0,
        mostHelpfulType: 'none'
      }
    }

    const totalHints = hintLogs.length
    const helpfulHints = hintLogs.filter((log: any) => log.was_helpful).length
    const effectiveness = (helpfulHints / totalHints) * 100

    // Count by type
    const typeCounts: Record<string, { total: number; helpful: number }> = {}
    hintLogs.forEach((log: any) => {
      const type = log.hint_type
      if (!typeCounts[type]) {
        typeCounts[type] = { total: 0, helpful: 0 }
      }
      typeCounts[type].total++
      if (log.was_helpful) {
        typeCounts[type].helpful++
      }
    })

    // Find most helpful type
    let mostHelpfulType = 'strategic'
    let maxEffectiveness = 0

    Object.entries(typeCounts).forEach(([type, counts]) => {
      const typeEffectiveness = (counts.helpful / counts.total) * 100
      if (typeEffectiveness > maxEffectiveness) {
        maxEffectiveness = typeEffectiveness
        mostHelpfulType = type
      }
    })

    return {
      totalHints,
      helpfulHints,
      effectiveness,
      mostHelpfulType
    }

  } catch (error) {
    console.error('[Micro-hints] Failed to analyze hint effectiveness:', error)
    return {
      totalHints: 0,
      helpfulHints: 0,
      effectiveness: 0,
      mostHelpfulType: 'none'
    }
  }
}
