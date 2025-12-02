/**
 * RAG Question Generator
 *
 * Generates practice questions when the question bank is insufficient
 * Uses concept tags and user's error patterns to create targeted questions
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface QuestionGenerationRequest {
  conceptTag: string
  subject: string
  difficulty: number // 1-5
  count: number
  userWeaknesses?: string[] // Additional context about user's mistakes
  relatedConcepts?: string[]
}

export interface GeneratedQuestion {
  question_text: string
  options: string[]
  correct_answer: string // A, B, C, or D
  explanation: string
  difficulty: number
  knowledge_tags: string[]
  metadata: {
    generated: true
    generation_method: 'rag'
    concept_tag: string
    timestamp: string
  }
}

const DIFFICULTY_DESCRIPTIONS = {
  1: 'very easy - basic understanding',
  2: 'easy - simple application',
  3: 'medium - moderate complexity',
  4: 'hard - advanced application',
  5: 'very hard - expert level'
}

const SUBJECT_TEMPLATES = {
  English: {
    prompt: `You are an expert English teacher creating practice questions for standardized tests like GSAT (學測) and SAT.`,
    examples: [
      {
        concept: 'tense-consistency',
        question: 'Which sentence demonstrates correct tense consistency?',
        options: [
          'She walked to the store and buys some milk.',
          'She walked to the store and bought some milk.',
          'She walks to the store and bought some milk.',
          'She will walk to the store and bought some milk.'
        ],
        correct: 'B',
        explanation: 'Both verbs should be in past tense to maintain consistency.'
      }
    ]
  },
  Math: {
    prompt: `You are an expert mathematics teacher creating practice questions for standardized tests.`,
    examples: [
      {
        concept: 'quadratic-equations',
        question: 'Solve for x: x² - 5x + 6 = 0',
        options: ['x = 1, 6', 'x = 2, 3', 'x = -2, -3', 'x = 3, 6'],
        correct: 'B',
        explanation: 'Factor to (x-2)(x-3) = 0, so x = 2 or x = 3'
      }
    ]
  }
}

/**
 * Generate practice questions using RAG
 */
export async function generateQuestions(
  request: QuestionGenerationRequest
): Promise<GeneratedQuestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }) // ⚡ Use 2.5 Flash

    const subjectTemplate = SUBJECT_TEMPLATES[request.subject as keyof typeof SUBJECT_TEMPLATES]
    if (!subjectTemplate) {
      throw new Error(`Unsupported subject: ${request.subject}`)
    }

    const difficultyDesc = DIFFICULTY_DESCRIPTIONS[request.difficulty as keyof typeof DIFFICULTY_DESCRIPTIONS]

    const prompt = `${subjectTemplate.prompt}

Create ${request.count} multiple-choice practice question(s) with the following specifications:

**Concept**: ${request.conceptTag}
**Subject**: ${request.subject}
**Difficulty**: ${request.difficulty}/5 (${difficultyDesc})
${request.relatedConcepts?.length ? `**Related Concepts**: ${request.relatedConcepts.join(', ')}` : ''}
${request.userWeaknesses?.length ? `**User Struggles With**: ${request.userWeaknesses.join(', ')}` : ''}

**Requirements**:
1. Each question must have exactly 4 options (A, B, C, D)
2. Only ONE option should be correct
3. Include a clear, educational explanation
4. Target the specified difficulty level
5. Focus on the concept: ${request.conceptTag}
6. Questions should be diverse and test different aspects of the concept
7. Use realistic scenarios similar to standardized test questions (GSAT, SAT, TOEFL)

**Example Format**:
${JSON.stringify(subjectTemplate.examples[0], null, 2)}

**Output Format** (return ONLY valid JSON, no markdown):
[
  {
    "question_text": "Your question here",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "B",
    "explanation": "Detailed explanation why B is correct and others are wrong",
    "knowledge_tags": ["${request.conceptTag}", "related-tag-1", "related-tag-2"]
  }
]

Generate ${request.count} high-quality question(s) now:`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Parse the response
    let questions: any[]
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response

      questions = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      console.error('[RAG] Failed to parse AI response:', response)
      throw new Error('Failed to parse AI-generated questions')
    }

    // Validate and transform questions
    const generatedQuestions: GeneratedQuestion[] = questions.map((q, index) => {
      // Validate required fields
      if (!q.question_text || !q.correct_answer || !q.explanation) {
        throw new Error(`Invalid question format at index ${index}`)
      }

      // Build options array
      const options = [
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d
      ].filter(opt => opt && opt.trim().length > 0)

      if (options.length !== 4) {
        throw new Error(`Question ${index} must have exactly 4 options`)
      }

      // Validate correct_answer is A, B, C, or D
      const correctAnswer = q.correct_answer.toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        throw new Error(`Invalid correct_answer at index ${index}: ${q.correct_answer}`)
      }

      return {
        question_text: q.question_text.trim(),
        options,
        correct_answer: correctAnswer,
        explanation: q.explanation.trim(),
        difficulty: request.difficulty,
        knowledge_tags: q.knowledge_tags || [request.conceptTag],
        metadata: {
          generated: true,
          generation_method: 'rag',
          concept_tag: request.conceptTag,
          timestamp: new Date().toISOString()
        }
      }
    })

    console.log(`[RAG] Successfully generated ${generatedQuestions.length} questions for concept: ${request.conceptTag}`)

    return generatedQuestions

  } catch (error) {
    console.error('[RAG] Question generation failed:', error)
    throw new Error(`Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate questions based on user's error book
 */
export async function generateFromErrorBook(
  userId: string,
  conceptTag: string,
  count: number,
  supabase: any
): Promise<GeneratedQuestion[]> {
  try {
    // Get user's errors for this concept
    const { data: errors } = await supabase
      .from('error_book')
      .select('question_id, explanation_text, knowledge_tags')
      .eq('user_id', userId)
      .contains('knowledge_tags', [conceptTag])
      .order('created_at', { ascending: false })
      .limit(5)

    // Extract weaknesses from error patterns
    const weaknesses: string[] = []
    if (errors && errors.length > 0) {
      // Analyze common mistakes
      errors.forEach((error: any) => {
        if (error.explanation_text) {
          // Extract key phrases about what went wrong
          const explanation = error.explanation_text.toLowerCase()
          if (explanation.includes('confused')) weaknesses.push('confusion with similar concepts')
          if (explanation.includes('tense')) weaknesses.push('tense usage')
          if (explanation.includes('subject-verb')) weaknesses.push('subject-verb agreement')
          // Add more pattern recognition as needed
        }
      })
    }

    // Get concept details
    const { data: conceptData } = await supabase
      .from('concept_tags')
      .select('tag_name, category, subject')
      .eq('tag_name', conceptTag)
      .single()

    if (!conceptData) {
      throw new Error(`Concept tag not found: ${conceptTag}`)
    }

    // Get user's proficiency for this concept to determine difficulty
    const { data: proficiency } = await supabase
      .from('user_concept_proficiency')
      .select('mastery_level')
      .eq('user_id', userId)
      .eq('concept_tag_id', conceptData.id)
      .single()

    // Map mastery to difficulty (inverse relationship)
    const masteryLevel = proficiency?.mastery_level || 50
    const difficulty = Math.max(1, Math.min(5, Math.ceil((100 - masteryLevel) / 20)))

    // Generate questions
    return generateQuestions({
      conceptTag,
      subject: conceptData.subject,
      difficulty,
      count,
      userWeaknesses: Array.from(new Set(weaknesses)), // Remove duplicates
      relatedConcepts: conceptData.category ? [conceptData.category] : undefined
    })

  } catch (error) {
    console.error('[RAG] Error generating from error book:', error)
    throw error
  }
}

/**
 * Cache generated questions in database for reuse
 */
export async function cacheGeneratedQuestion(
  question: GeneratedQuestion,
  supabase: any
): Promise<string | null> {
  try {
    // Store in seed_questions table for future use
    const { data, error } = await supabase
      .from('seed_questions')
      .insert({
        question_text: question.question_text,
        option_a: question.options[0],
        option_b: question.options[1],
        option_c: question.options[2],
        option_d: question.options[3],
        correct_answer: question.correct_answer,
        explanation_text: question.explanation,
        difficulty_level: question.difficulty,
        knowledge_tags: question.knowledge_tags,
        subject: question.metadata.concept_tag.split('-')[0] || 'English', // Extract subject from tag
        is_active: true,
        metadata: question.metadata
      })
      .select('id')
      .single()

    if (error) {
      console.error('[RAG] Failed to cache question:', error)
      return null
    }

    return data?.id || null

  } catch (error) {
    console.error('[RAG] Error caching question:', error)
    return null
  }
}
