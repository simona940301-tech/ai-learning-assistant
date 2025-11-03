import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AnswerQuestionRequest, AnswerQuestionResponse } from '@plms/shared/types';
import { AnswerQuestionRequestSchema } from '@plms/shared/types';
import { checkRateLimit } from '@/lib/rate-limit';

// Anti-cheat: Track recent answers for suspicious activity detection
const recentAnswers = new Map<string, Array<{ timestamp: number; timeSpent: number }>>();

/**
 * POST /api/missions/answer
 *
 * Submit answer for a mission question
 * Requires authentication
 * Rate limit: ≤60 req/min per mission
 * Anti-cheat: answerable_until (2hr), suspicious activity detection
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
    const validated = AnswerQuestionRequestSchema.parse(body);

    // Rate limiting: ≤60 req/min per mission
    const rateLimit = checkRateLimit(validated.userMissionId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down.',
          },
          rateLimit: {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            resetAt: new Date(rateLimit.resetAt).toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Get mission
    const { data: mission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('id', validated.userMissionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MISSION_NOT_FOUND', message: 'Mission not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Anti-cheat: Check answerable_until (2hr timeout)
    if (mission.answerable_until) {
      const timeoutAt = new Date(mission.answerable_until);
      if (Date.now() > timeoutAt.getTime()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSION_EXPIRED',
              message: 'This mission has expired (2 hour limit). Please start a new one.',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    // Anti-cheat: Check if mission is still in progress
    if (mission.status !== 'in_progress') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSION_NOT_ACTIVE',
            message: 'This mission is not active',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Anti-cheat: Detect suspicious activity (< 500ms && multiple consecutive)
    const userKey = `${user.id}:${validated.userMissionId}`;
    let isSuspicious = false;
    let suspiciousReason = '';

    if (validated.timeSpentMs && validated.timeSpentMs < 500) {
      // Get recent answers for this user/mission
      const recent = recentAnswers.get(userKey) || [];
      const now = Date.now();

      // Filter answers from last 30 seconds
      const recentFiltered = recent.filter(a => now - a.timestamp < 30000);

      // Add current answer
      recentFiltered.push({ timestamp: now, timeSpent: validated.timeSpentMs });
      recentAnswers.set(userKey, recentFiltered);

      // Check if ≥3 consecutive answers with < 500ms
      const fastAnswers = recentFiltered.filter(a => a.timeSpent < 500);
      if (fastAnswers.length >= 3) {
        isSuspicious = true;
        suspiciousReason = `${fastAnswers.length} consecutive answers < 500ms`;
        console.warn('[Anti-cheat] Suspicious activity detected:', {
          userId: user.id,
          missionId: validated.userMissionId,
          reason: suspiciousReason,
        });
      }
    }

    // Get question
    const { data: question } = await supabase
      .from('pack_questions')
      .select('*')
      .eq('id', validated.questionId)
      .single();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Check answer
    const isCorrect = validated.answer.trim().toUpperCase() === question.answer.trim().toUpperCase();

    // Update mission progress
    await supabase.rpc('update_mission_progress', {
      p_user_mission_id: validated.userMissionId,
      p_is_correct: isCorrect,
    });

    // Log answer event (with suspicious flag)
    await supabase.from('mission_logs').insert({
      user_mission_id: validated.userMissionId,
      user_id: user.id,
      event_type: 'answer',
      question_id: validated.questionId,
      is_correct: isCorrect,
      time_spent_ms: validated.timeSpentMs,
      suspicious: isSuspicious,
      suspicious_reason: suspiciousReason || null,
      payload: {
        answer: validated.answer,
        correctAnswer: question.answer,
        difficulty: question.difficulty,
      },
    });

    // Update question history
    await supabase
      .from('user_question_history')
      .update({ was_correct: isCorrect })
      .eq('user_id', user.id)
      .eq('question_id', validated.questionId)
      .eq('context', 'mission');

    // If incorrect, add to error book (if not already there)
    if (!isCorrect) {
      const { data: existingError } = await supabase
        .from('error_book')
        .select('id, attempt_count')
        .eq('user_id', user.id)
        .eq('question_id', validated.questionId)
        .single();

      if (!existingError) {
        await supabase.from('error_book').insert({
          user_id: user.id,
          question_id: validated.questionId,
          pack_id: question.pack_id,
          status: 'active',
          first_attempted_at: new Date().toISOString(),
          last_attempted_at: new Date().toISOString(),
          attempt_count: 1,
        });
      } else {
        await supabase
          .from('error_book')
          .update({
            last_attempted_at: new Date().toISOString(),
            attempt_count: (existingError.attempt_count || 0) + 1,
          })
          .eq('id', existingError.id);
      }
    }

    // Get updated mission progress
    const { data: updatedMission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('id', validated.userMissionId)
      .single();

    const response: AnswerQuestionResponse = {
      success: true,
      isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation || '',
      progress: {
        correctCount: updatedMission.correct_count,
        totalAnswered: updatedMission.total_answered,
        questionCount: updatedMission.question_count,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Mission Answer API] Error:', error);
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
