import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        // Fetch 3 active questions, one for each difficulty level if possible, or just ordered by difficulty
        // Ideally we want difficulty 1, 2, 3 in order.
        const { data: questions, error } = await supabase
            .from('onboarding_questions')
            .select('*')
            .eq('is_active', true)
            .order('difficulty_level', { ascending: true })
            .limit(3);

        if (error) {
            console.error('Error fetching onboarding questions:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!questions || questions.length === 0) {
            return NextResponse.json({ success: false, error: 'No questions found' }, { status: 404 });
        }

        // Format for battle-ws
        const formattedQuestions = questions.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            options: [q.option_a, q.option_b, q.option_c, q.option_d],
            correct_answer: q.correct_answer, // 'A', 'B', 'C', 'D'
            difficulty: q.difficulty_level,
            time_limit: 15, // Fixed time limit for onboarding
        }));

        return NextResponse.json({
            success: true,
            questions: formattedQuestions,
        });
    } catch (error) {
        console.error('Unexpected error in onboarding questions API:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
