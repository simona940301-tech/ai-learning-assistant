import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

/**
 * POST /api/play/practice/create
 * Create a new Infinite Practice Room
 */
export async function POST(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        const body = await req.json()
        const { sourceType, sourceConfig, subject, setId, selectedQuestionIds } = body

        if (!sourceType || !['FILE_RAG', 'SUBJECT_TAG', 'MIXED', 'ERROR_BOOK', 'QUESTION_SET', 'UGC', 'ENGLISH'].includes(sourceType)) {
            return NextResponse.json({ error: 'INVALID_SOURCE_TYPE' }, { status: 400 })
        }

        // 🎯 ERROR_BOOK 專用邏輯：檢查用戶是否有錯題
        if (sourceType === 'ERROR_BOOK') {
            // 如果有 selectedQuestionIds，驗證這些題目是否都在用戶的錯題本中
            if (selectedQuestionIds && Array.isArray(selectedQuestionIds) && selectedQuestionIds.length > 0) {
                const { data: errorItems, error: errorCheckError } = await supabase
                    .from('error_book')
                    .select('question_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .in('question_id', selectedQuestionIds)

                if (errorCheckError) {
                    console.error('Error checking error_book:', errorCheckError)
                    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
                }

                if (!errorItems || errorItems.length !== selectedQuestionIds.length) {
                    return NextResponse.json({
                        error: '部分題目不在您的錯題本中',
                        success: false
                    }, { status: 400 })
                }
            } else {
                // 如果沒有指定題目，檢查錯題本是否有題目
                let errorQuery = supabase
                    .from('error_book')
                    .select('question_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active')

                const { data: errorItems, error: errorCheckError } = await errorQuery

                if (errorCheckError) {
                    console.error('Error checking error_book:', errorCheckError)
                    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
                }

                if (!errorItems || errorItems.length === 0) {
                    return NextResponse.json({
                        error: '錯題本為空，請先在對戰中答錯題目',
                        success: false
                    }, { status: 400 })
                }

                // 如果有科目過濾，需要進一步檢查該科目是否有錯題
                if (subject) {
                    const { data: subjectErrors } = await supabase
                        .from('error_book')
                        .select(`
                            question_id,
                            pack_questions!inner (
                                packs!inner (
                                    subject
                                )
                            )
                        `)
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .eq('pack_questions.packs.subject', subject)

                    if (!subjectErrors || subjectErrors.length === 0) {
                        return NextResponse.json({
                            error: `${subject} 科目的錯題本為空`,
                            success: false
                        }, { status: 400 })
                    }
                }
            }
        }

        // 🎯 QUESTION_SET 專用邏輯：驗證題本存在且用戶已下載
        if (sourceType === 'QUESTION_SET') {
            if (!setId) {
                return NextResponse.json({
                    error: 'setId is required for QUESTION_SET type',
                    success: false
                }, { status: 400 })
            }

            // 驗證用戶已下載該題本
            const { data: userSet, error: userSetError } = await supabase
                .from('user_question_sets')
                .select(`
                    id,
                    question_sets (
                        id,
                        title,
                        question_ids,
                        question_source,
                        status
                    )
                `)
                .eq('user_id', user.id)
                .eq('set_id', setId)
                .maybeSingle()

            if (userSetError) {
                console.error('Error checking user_question_sets:', userSetError)
                return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
            }

            if (!userSet || !userSet.question_sets) {
                return NextResponse.json({
                    error: '題本不存在或尚未下載',
                    success: false
                }, { status: 404 })
            }

            const questionSet = Array.isArray(userSet.question_sets)
                ? userSet.question_sets[0]
                : userSet.question_sets;

            if (!questionSet) {
                return NextResponse.json({
                    error: '題本不存在或尚未下載',
                    success: false
                }, { status: 404 })
            }

            if (questionSet.status !== 'PUBLISHED') {
                return NextResponse.json({
                    error: '題本目前無法使用',
                    success: false
                }, { status: 403 })
            }

            if (!questionSet.question_ids || questionSet.question_ids.length === 0) {
                return NextResponse.json({
                    error: '題本中沒有題目',
                    success: false
                }, { status: 400 })
            }
        }

        // Generate a 6-char room code
        const roomCode = nanoid(6).toUpperCase()

        // Generate a random seed for deterministic shuffling
        const seed = Math.random().toString(36).substring(7)

        // 🎯 為 ERROR_BOOK 構建 source_config
        let finalSourceConfig = sourceConfig || {}
        if (sourceType === 'ERROR_BOOK') {
            finalSourceConfig = {
                source_type: 'ERROR_BOOK',
                user_id: user.id,
                subject_filter: subject || null,
                selected_question_ids: selectedQuestionIds || null
            }
        } else if (sourceType === 'QUESTION_SET') {
            finalSourceConfig = {
                source_type: 'QUESTION_SET',
                set_id: setId,
                user_id: user.id
            }
        }

        // Create room
        const { data: room, error: roomError } = await supabase
            .from('practice_rooms')
            .insert({
                room_code: roomCode,
                host_id: user.id,
                source_type: sourceType,
                source_config: finalSourceConfig,
                question_order_seed: seed,
                status: 'ACTIVE'
            })
            .select()
            .single()

        if (roomError) {
            console.error('Create room error:', roomError)
            return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 })
        }

        // Add host as first participant
        await supabase.from('practice_participants').insert({
            room_id: room.id,
            user_id: user.id,
            current_question_index: 0
        })

        return NextResponse.json({ success: true, room })
    } catch (error) {
        console.error('Create practice room error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
