import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import seedrandom from 'seedrandom'

export const dynamic = 'force-dynamic'

/**
 * GET /api/play/practice/questions
 * Fetch questions for a room with deterministic shuffling
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const roomId = searchParams.get('roomId')
        const offset = parseInt(searchParams.get('offset') || '0')
        const limit = parseInt(searchParams.get('limit') || '10')

        if (!roomId) {
            return NextResponse.json({ error: 'MISSING_ROOM_ID' }, { status: 400 })
        }

        // 1. Get room config
        const { data: room, error: roomError } = await supabase
            .from('practice_rooms')
            .select('*')
            .eq('id', roomId)
            .single()

        if (roomError || !room) {
            return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
        }

        // 2. Fetch ALL eligible question IDs (lightweight)
        // In production with millions of rows, use a more scalable approach (e.g. pre-shuffled table)
        // For MVP/RAG (<1000 questions), fetching IDs is fine.

        let allQuestions: any[] = []
        let isFullObjectMode = false

        // 🎯 ERROR_BOOK 專用查詢邏輯
        if (room.source_type === 'ERROR_BOOK') {
            isFullObjectMode = true
            const userId = room.source_config?.user_id
            const subjectFilter = room.source_config?.subject_filter

            if (!userId) {
                return NextResponse.json({ error: 'INVALID_CONFIG', message: 'Missing user_id in source_config' }, { status: 400 })
            }

            // 查詢錯題本中的 question_id
            const selectedIds = room.source_config?.selected_question_ids
            let questionIds: string[] = []

            if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
                const { data: errorItems } = await supabase
                    .from('error_book')
                    .select('question_id')
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .in('question_id', selectedIds)

                if (errorItems) questionIds = errorItems.map(item => item.question_id)
            } else {
                const { data: errorItems } = await supabase
                    .from('error_book')
                    .select('question_id')
                    .eq('user_id', userId)
                    .eq('status', 'active')

                if (errorItems) questionIds = errorItems.map(item => item.question_id)
            }

            if (questionIds.length > 0) {
                let packQuestionsQuery = supabase
                    .from('pack_questions')
                    .select(`
                        id, stem, choices, answer, explanation, difficulty,
                        packs (subject, skill)
                    `)
                    .in('id', questionIds)

                if (subjectFilter) {
                    packQuestionsQuery = packQuestionsQuery.eq('packs.subject', subjectFilter)
                }

                const { data: packQuestions } = await packQuestionsQuery

                if (packQuestions) {
                    allQuestions = packQuestions.map((q: any) => ({
                        id: q.id,
                        question_text: q.stem,
                        options: q.choices || [],
                        correct_answer: q.answer,
                        explanation: q.explanation,
                        difficulty: q.difficulty || 3,
                        subject: q.packs?.subject,
                        skill_tags: q.packs?.skill ? [q.packs.skill] : []
                    }))
                }
            }

        } else if (room.source_type === 'QUESTION_SET') {
            isFullObjectMode = true
            const setId = room.source_config?.set_id
            if (!setId) return NextResponse.json({ error: 'INVALID_CONFIG' }, { status: 400 })

            const { data: questionSet } = await supabase
                .from('question_sets')
                .select('question_ids, question_source')
                .eq('id', setId)
                .single()

            if (questionSet && questionSet.question_ids?.length > 0) {
                const ids = questionSet.question_ids
                const source = questionSet.question_source || 'seed_questions'

                if (source === 'seed_questions') {
                    const { data: seeds } = await supabase.from('seed_questions').select('*').in('id', ids)
                    if (seeds) {
                        allQuestions = seeds.map((q: any) => ({
                            id: q.id,
                            question_text: q.question_text || q.stem,
                            options: q.options || q.choices || [],
                            correct_answer: q.correct_answer || q.answer,
                            explanation: q.explanation,
                            difficulty: q.difficulty_level || q.difficulty || 3,
                            subject: q.subject,
                            skill_tags: q.knowledge_tags || []
                        }))
                    }
                } else if (source === 'pack_questions') {
                    const { data: packs } = await supabase
                        .from('pack_questions')
                        .select('*, packs(subject, skill)')
                        .in('id', ids)
                    if (packs) {
                        allQuestions = packs.map((q: any) => ({
                            id: q.id,
                            question_text: q.stem,
                            options: q.choices || [],
                            correct_answer: q.answer,
                            explanation: q.explanation,
                            difficulty: q.difficulty || 3,
                            subject: q.packs?.subject,
                            skill_tags: q.packs?.skill ? [q.packs.skill] : []
                        }))
                    }
                } else if (source === 'ugc_questions') {
                    const { data: ugc } = await supabase.from('ugc_questions').select('*').in('id', ids)
                    if (ugc) {
                        allQuestions = ugc.map((q: any) => ({
                            id: q.id,
                            question_text: q.question_text,
                            options: [q.option_a, q.option_b, q.option_c, q.option_d],
                            correct_answer: q.correct_answer,
                            explanation: null,
                            difficulty: q.difficulty || 3,
                            subject: q.subject,
                            skill_tags: q.skill_tags || []
                        }))
                    }
                }
            }

        } else {
            // Default Strategy: FILE_RAG, SUBJECT_TAG, MIXED
            let query = supabase.from('exam_question_bank').select('id')

            if (room.source_type === 'FILE_RAG') {
                const fileIds = room.source_config?.file_ids || []
                if (fileIds.length > 0) query = query.in('file_id', fileIds)
            }

            const { data: examQuestions } = await query

            if (examQuestions && examQuestions.length > 0) {
                // Found in exam_question_bank
                allQuestions = examQuestions // Only IDs
                isFullObjectMode = false
            } else {
                // ⚠️ Fallback: Use seed_questions
                const { data: seeds } = await supabase
                    .from('seed_questions')
                    .select('*')
                    .eq('status', 'active')
                    .limit(50)

                if (seeds) {
                    allQuestions = seeds.map(s => ({
                        id: s.id,
                        question_text: s.stem,
                        options: s.choices['A'] ? [s.choices['A'], s.choices['B'], s.choices['C'], s.choices['D']] : (s.choices || []),
                        correct_answer: s.answer,
                        explanation: s.explanation,
                        difficulty: s.difficulty || 3,
                        subject: s.subject
                    }))
                    isFullObjectMode = true // Fallback provides full objects
                }
            }
        }

        if (allQuestions.length === 0) {
            return NextResponse.json({ questions: [], total: 0, hasMore: false })
        }

        // 3. Deterministic Shuffle
        const rng = seedrandom(room.question_order_seed)
        const shuffled = [...allQuestions]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 4. Slice & Return
        const sliced = shuffled.slice(offset, offset + limit)

        if (isFullObjectMode) {
            return NextResponse.json({
                questions: sliced,
                total: shuffled.length,
                hasMore: offset + limit < shuffled.length
            })
        } else {
            // Fetch details for sliced IDs
            const ids = sliced.map(q => q.id)
            const { data: details } = await supabase
                .from('exam_question_bank')
                .select('*')
                .in('id', ids)

            // Re-sort
            const ordered = ids
                .map(id => details?.find(d => d.id === id))
                .filter(Boolean)

            return NextResponse.json({
                questions: ordered,
                total: shuffled.length,
                hasMore: offset + limit < shuffled.length
            })
        }
    } catch (error) {
        console.error('Fetch practice questions error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
