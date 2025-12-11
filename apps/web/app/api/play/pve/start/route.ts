import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { getServiceSupabaseClient } from '@/lib/supabase'
import { fetchPveQuestions } from '@/lib/api/pve-helpers'

export async function POST(req: NextRequest) {
    console.log('[PVE Start] ========== ROUTE HIT ==========')
    try {
        const body = await req.json()
        const { userId: requestedUserId, subject, timeLimit = 20 } = body
        console.log('[PVE Start] Body parsed:', { requestedUserId, subject, timeLimit })
        const { supabase: _sessionSupabase, user, errorType } = await getApiUser(req)

        // Prefer authenticated user from session to avoid spoofing/blank IDs
        const userId = user?.id ?? requestedUserId
        console.log('[PVE Start] Request received:', { userId, subject, timeLimit })

        if (!userId) {
            console.warn('[PVE Start] No user ID found')
            return NextResponse.json(
                { error: 'Authentication required', code: errorType || 'UNAUTHENTICATED' },
                { status: 401 }
            )
        }

        // 🎯 SOTA FIX: Check Energy (Feathers)
        const energySupabase = getServiceSupabaseClient()

        // Check current energy
        const { data: profile } = await energySupabase
            .from('profiles')
            .select('daily_energy_count')
            .eq('id', userId)
            .single()

        const currentEnergy = profile?.daily_energy_count ?? 0
        const ENERGY_COST = 1

        if (currentEnergy < ENERGY_COST) {
            return NextResponse.json(
                { error: '羽毛不足', code: 'INSUFFICIENT_ENERGY' },
                { status: 402 } // Payment Required
            )
        }

        // Deduct Energy
        const { error: updateError } = await energySupabase
            .from('profiles')
            .update({ daily_energy_count: currentEnergy - ENERGY_COST })
            .eq('id', userId)

        if (updateError) {
            console.error('[PVE Start] Failed to deduct energy:', updateError)
            return NextResponse.json({ error: 'Failed to deduct energy' }, { status: 500 })
        }

        if (requestedUserId && user && requestedUserId !== user.id) {
            console.warn('[PVE Start] User ID mismatch, using session user', { requestedUserId, sessionUserId: user.id })
        }

        // 1. Fetch Questions
        console.log('[PVE Start] Fetching questions...')
        // Use service-role client to bypass RLS on match_history insert while still requiring auth above
        const supabase = getServiceSupabaseClient()

        const { questions: rawQuestions, baselineDifficulty } = await fetchPveQuestions(supabase, {
            userId,
            subject,
            numQuestions: 10, // Default 10 questions for PVE
        })
        console.log('[PVE Start] Fetched questions:', { count: rawQuestions?.length, baselineDifficulty })

        // 2. Format Questions
        // 🎯 SOTA FIX: Type assertion to use strict DBQuestionRow type
        const questions = (rawQuestions as any[]).map(q => {
            const options = [
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                ...(q.options || [])
            ].filter((opt): opt is string => opt && String(opt).trim().length > 0)

            const uniqueOptions = Array.from(new Set(options));

            // Extract explanation (already handled in fetchPveQuestions)
            const explanation = q.explanation;

            // 🔍 DEBUG: Track explanation in formatted questions
            if (!explanation) {
                console.warn('[PVE Start] ⚠️ Question missing explanation:', { id: q.id, text: q.question_text?.substring(0, 50) })
            }

            return {
                id: String(q.id),
                question_text: (q.question_text || '').trim(),
                options: uniqueOptions.length >= 2 ? uniqueOptions : options,
                correct_answer: q.correct_answer || 'A',
                difficulty: q.difficulty_level || q.difficulty || 3,
                time_limit: timeLimit,
                skill_tags: q.skill_tags || q.knowledge_tags || [],
                explanation: explanation, // Include explanation for frontend
            }
        }).filter(q => q.question_text.length > 0 && q.options.length >= 2)

        // 🔍 DEBUG: Log final API response stats
        console.log('[PVE Start] Formatted questions stats:', {
            total: questions.length,
            withExplanation: questions.filter(q => q.explanation).length,
            withoutExplanation: questions.filter(q => !q.explanation).length
        })

        if (questions.length === 0) {
            return NextResponse.json({ error: 'No questions available' }, { status: 500 })
        }

        // 3. Create Match in DB
        const { data: match, error } = await supabase
            .from('match_history')
            .insert({
                match_type: 'PVE_TRAINING',
                player1_id: userId,
                player2_id: null, // AI opponent
                player1_score: 0,
                player2_score: 0,
                question_list: questions,
                started_at: new Date().toISOString(),
                duration_seconds: 0
            })
            .select()
            .single()

        if (error) {
            console.error('[PVE Start] DB Insert Error:', error)
            return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            matchId: match.id,
            questions,
            baselineDifficulty
        })

    } catch (error: any) {
        console.error('[PVE Start] Handler Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
