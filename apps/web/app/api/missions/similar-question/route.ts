import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSimilarQuestion } from '@/lib/mission-sampler';
import type { GetSimilarQuestionRequest, GetSimilarQuestionResponse } from '@plms/shared/types';
import { GetSimilarQuestionRequestSchema } from '@plms/shared/types';

/**
 * POST /api/missions/similar-question
 *
 * Get similar question for Immediate Retry
 * Same skill, near difficulty (±1 level)
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Parse request
    const body = await req.json();
    const validated = GetSimilarQuestionRequestSchema.parse(body);

    // Get similar question
    const similarQuestion = await getSimilarQuestion(
      user.id,
      validated.currentQuestionId,
      validated.skill,
      validated.difficulty
    );

    if (!similarQuestion) {
      const response: GetSimilarQuestionResponse = {
        success: false,
        message: 'No similar questions available at this time.',
      };

      return NextResponse.json({
        success: true, // Request succeeded, but no question found
        data: response,
        timestamp: new Date().toISOString(),
      });
    }

    // Add to question history
    await supabase.from('user_question_history').insert({
      user_id: user.id,
      question_id: similarQuestion.id,
      context: 'practice', // Immediate retry is practice context
      shown_at: new Date().toISOString(),
    });

    const response: GetSimilarQuestionResponse = {
      success: true,
      question: {
        id: similarQuestion.id,
        stem: similarQuestion.stem,
        choices: similarQuestion.choices,
        difficulty: similarQuestion.difficulty!,
        skill: similarQuestion.skill!,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Similar Question API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
