import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { getNextPracticeCards, SRSCard } from '@/lib/srs-scheduler'
import { generateFromErrorBook } from '@/lib/services/rag-question-generator'

export const dynamic = 'force-dynamic'

interface ConceptWithSRS extends SRSCard {
  concept_tag_id: string
  mastery_level: number
  tag_name: string
  category: string
  subject: string
}

/**
 * GET /api/error-book/practice
 *
 * ENHANCED: Get practice questions using SRS scheduling
 * - Prioritizes concepts due for review
 * - Uses spaced repetition algorithm
 * - Falls back to RAG generation when needed
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            const message =
                errorType === 'invalid-jwt'
                    ? '登入狀態失效,請重新登入或清除 Cookies 後再試。'
                    : errorType === 'unauthenticated'
                        ? 'Authentication required'
                        : 'Authentication error occurred'

            return NextResponse.json(
                {
                    error: 'UNAUTHORIZED',
                    message,
                    errorType,
                },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(req.url)
        const concept = searchParams.get('concept')
        const limit = parseInt(searchParams.get('limit') || '5')
        const useSRS = searchParams.get('useSRS') !== 'false' // Default to true

        // MODE 1: SRS-based practice (recommended)
        if (useSRS && !concept) {
            // Get user's concept proficiency with SRS data
            const { data: conceptProficiency } = await supabase
                .from('user_concept_proficiency')
                .select(`
                    *,
                    concept_tags (
                        id,
                        tag_name,
                        category,
                        subject
                    )
                `)
                .eq('user_id', user.id)

            if (!conceptProficiency || conceptProficiency.length === 0) {
                return NextResponse.json({
                    success: true,
                    questions: [],
                    mode: 'srs',
                    message: '還沒有練習記錄，請先完成一些題目'
                })
            }

            // Transform to SRS cards format
            const srsCards: ConceptWithSRS[] = conceptProficiency.map(cp => ({
                concept_tag_id: cp.concept_tag_id,
                mastery_level: cp.mastery_level,
                tag_name: (cp.concept_tags as any)?.tag_name || '',
                category: (cp.concept_tags as any)?.category || '',
                subject: (cp.concept_tags as any)?.subject || '',
                consecutiveCorrect: cp.consecutive_correct,
                easeFactor: cp.ease_factor,
                intervalDays: cp.review_interval_days,
                lastReviewedAt: cp.last_practiced_at ? new Date(cp.last_practiced_at) : null,
                nextReviewAt: cp.next_review_at ? new Date(cp.next_review_at) : null
            }))

            // Use SRS scheduler to get optimal practice concepts
            const practiceCards = getNextPracticeCards(srsCards, limit, true)

            // Get questions for these concepts
            const conceptTagIds = practiceCards.map(c => c.concept_tag_id)

            // Get all answered questions
            const { data: answeredQuestions } = await supabase
                .from('user_answers')
                .select('question_id')
                .eq('user_id', user.id)

            const answeredIds = answeredQuestions?.map(a => a.question_id) || []

            // Fetch questions for the selected concepts
            let allQuestions: any[] = []

            for (const card of practiceCards) {
                const { data: questions } = await supabase
                    .from('pack_questions')
                    .select(`
                        id,
                        stem,
                        choices,
                        answer,
                        explanation,
                        difficulty,
                        knowledge_tags,
                        packs (
                            id,
                            subject,
                            skill
                        )
                    `)
                    .contains('knowledge_tags', [card.tag_name])
                    .not('id', 'in', `(${answeredIds.join(',') || 'null'})`)
                    .eq('has_explanation', true)
                    .limit(2) // Get 2 questions per concept

                if (questions && questions.length > 0) {
                    allQuestions.push(...questions.map(q => ({
                        ...q,
                        srs_metadata: {
                            concept: card.tag_name,
                            mastery_level: card.mastery_level,
                            due_status: card.nextReviewAt && card.nextReviewAt <= new Date() ? 'overdue' : 'review'
                        }
                    })))
                }
            }

            // Limit to requested count
            const finalQuestions = allQuestions.slice(0, limit)

            // If not enough questions, generate with RAG
            if (finalQuestions.length < limit) {
                const shortage = limit - finalQuestions.length
                const weakestConcepts = practiceCards
                    .filter(c => !finalQuestions.some(q => q.srs_metadata.concept === c.tag_name))
                    .slice(0, shortage)

                // Generate questions with RAG for these concepts
                try {
                    for (const conceptCard of weakestConcepts) {
                        if (finalQuestions.length >= limit) break

                        const ragQuestions = await generateFromErrorBook(
                            user.id,
                            conceptCard.tag_name,
                            Math.min(2, shortage - (finalQuestions.length - allQuestions.length)),
                            supabase
                        )

                        // Transform RAG questions to match expected format
                        const transformedQuestions = ragQuestions.map(q => ({
                            id: `rag_${Date.now()}_${Math.random()}`,
                            stem: q.question_text,
                            choices: q.options,
                            answer: q.correct_answer,
                            explanation: q.explanation,
                            difficulty: q.difficulty,
                            knowledge_tags: q.knowledge_tags,
                            packs: {
                                id: null,
                                subject: conceptCard.subject,
                                skill: conceptCard.category
                            },
                            srs_metadata: {
                                concept: conceptCard.tag_name,
                                mastery_level: conceptCard.mastery_level,
                                due_status: 'generated',
                                is_rag_generated: true
                            }
                        }))

                        finalQuestions.push(...transformedQuestions)
                    }
                } catch (ragError) {
                    console.error('[SRS Practice] RAG generation failed:', ragError)
                    // Continue with available questions even if RAG fails
                }
            }

            return NextResponse.json({
                success: true,
                mode: 'srs',
                questions: finalQuestions,
                count: finalQuestions.length,
                srs_info: {
                    total_concepts: srsCards.length,
                    due_concepts: practiceCards.filter(c => c.nextReviewAt && c.nextReviewAt <= new Date()).length,
                    practicing_concepts: practiceCards.map(c => ({
                        name: c.tag_name,
                        mastery: c.mastery_level,
                        interval_days: c.intervalDays
                    }))
                },
                message: finalQuestions.length === 0
                    ? '目前沒有需要複習的概念'
                    : `已為你挑選 ${finalQuestions.length} 題,根據間隔重複演算法優化學習效果`
            })
        }

        // MODE 2: Concept-specific practice (legacy, for specific concept requests)
        if (!concept) {
            return NextResponse.json(
                {
                    error: 'VALIDATION_ERROR',
                    message: 'concept parameter is required when useSRS=false',
                },
                { status: 400 }
            )
        }

        // Get all questions user has already answered
        const { data: answeredQuestions } = await supabase
            .from('user_answers')
            .select('question_id')
            .eq('user_id', user.id)

        const answeredIds = answeredQuestions?.map(a => a.question_id) || []

        // Find questions with the same concept that user hasn't answered
        const { data: conceptQuestions, error } = await supabase
            .from('pack_questions')
            .select(`
                id,
                stem,
                choices,
                answer,
                explanation,
                difficulty,
                knowledge_tags,
                packs (
                    id,
                    subject,
                    skill
                )
            `)
            .contains('knowledge_tags', [concept])
            .not('id', 'in', `(${answeredIds.join(',') || 'null'})`)
            .eq('has_explanation', true)
            .limit(limit)

        if (error) {
            console.error('[Concept Practice API] Error fetching questions:', error)
            return NextResponse.json(
                {
                    error: 'DATABASE_ERROR',
                    message: error.message,
                },
                { status: 500 }
            )
        }

        let finalQuestions = conceptQuestions || []

        if (finalQuestions.length < limit) {
            // Generate questions with RAG when insufficient
            try {
                const shortage = limit - finalQuestions.length
                const ragQuestions = await generateFromErrorBook(
                    user.id,
                    concept,
                    shortage,
                    supabase
                )

                // Transform RAG questions to match expected format
                const transformedQuestions = ragQuestions.map(q => {
                    const firstPack = conceptQuestions?.[0]?.packs
                    const pack = Array.isArray(firstPack) ? firstPack[0] : firstPack
                    return {
                    id: `rag_${Date.now()}_${Math.random()}`,
                    stem: q.question_text,
                    choices: q.options,
                    answer: q.correct_answer,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    knowledge_tags: q.knowledge_tags,
                    packs: [{
                        id: null,
                        subject: pack?.subject || 'English',
                        skill: pack?.skill || ''
                    }],
                    is_rag_generated: true
                }})

                finalQuestions.push(...transformedQuestions)
            } catch (ragError) {
                console.error('[Concept Practice] RAG generation failed:', ragError)
                // Continue with available questions even if RAG fails
            }
        }

        return NextResponse.json({
            success: true,
            mode: 'concept',
            concept,
            questions: finalQuestions,
            count: finalQuestions.length,
            message: finalQuestions.length === 0
                ? '目前沒有更多相關題目，建議複習錯題本中的題目'
                : `找到 ${finalQuestions.length} 題相關練習`
        })

    } catch (error) {
        console.error('[Concept Practice API] Unexpected error:', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
