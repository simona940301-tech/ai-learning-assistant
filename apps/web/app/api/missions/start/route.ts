import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sampleQuestions } from '@/lib/mission-sampler';
import type { StartMissionRequest, StartMissionResponse } from '@plms/shared/types';
import { StartMissionRequestSchema } from '@plms/shared/types';

/**
 * POST /api/missions/start
 *
 * Start today's mission (or create if doesn't exist)
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
    const validated = StartMissionRequestSchema.parse(body);

    // Calculate window_date (Asia/Taipei 05:00 boundary)
    const { data: windowData } = await supabase.rpc('calculate_window_date');
    const windowDate = windowData || new Date().toISOString().split('T')[0];

    // Check if mission already exists for this window (IDEMPOTENT)
    const { data: existingMission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', user.id)
      .eq('window_date', windowDate)
      .maybeSingle();

    if (existingMission) {
      console.log('[Mission Start] Mission already exists for window:', windowDate, 'Status:', existingMission.status);

      // IDEMPOTENT: Return existing mission if active
      if (existingMission.status === 'in_progress' || existingMission.status === 'pending') {
        // Update to in_progress if still pending
        if (existingMission.status === 'pending') {
          await supabase
            .from('user_missions')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMission.id);

          existingMission.status = 'in_progress';
          existingMission.started_at = new Date().toISOString();
        }

        // Get questions for this mission
        const questions = await getQuestionsForMission(supabase, existingMission.question_ids);

        const response: StartMissionResponse = {
          success: true,
          userMission: {
            ...transformUserMission(existingMission),
            questions,
          },
          message: 'Returning existing active mission (idempotent)',
        };

        return NextResponse.json({
          success: true,
          data: response,
          timestamp: new Date().toISOString(),
        });
      }

      // If completed, user is trying to start again - return error
      if (existingMission.status === 'completed') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSION_ALREADY_COMPLETED',
              message: 'Today\'s mission is already completed. Come back tomorrow!',
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    // Create new mission
    // Get default mission template
    const { data: missionTemplate } = await supabase
      .from('missions')
      .select('*')
      .eq('mission_type', 'daily')
      .eq('status', 'active')
      .single();

    const numQuestions = missionTemplate?.num_questions || 5;
    const packRatio = missionTemplate?.pack_ratio || 0.7;
    const errorBookRatio = missionTemplate?.error_book_ratio || 0.3;

    // Sample questions
    console.log('[Mission Start] Sampling questions for user:', user.id);
    const samplerResult = await sampleQuestions({
      userId: user.id,
      numQuestions,
      packRatio,
      errorBookRatio,
      targetSkill: missionTemplate?.target_skill,
      targetDifficulty: missionTemplate?.difficulty,
    });

    if (samplerResult.questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_QUESTIONS',
            message: 'No questions available. Please install some packs first.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Create user_mission record
    const questionIds = samplerResult.questions.map(q => q.id);
    const now = new Date().toISOString();
    const { data: newMission, error: createError } = await supabase
      .from('user_missions')
      .insert({
        user_id: user.id,
        mission_id: missionTemplate?.id,
        mission_date: windowDate, // Use window_date
        window_date: windowDate, // Explicitly set window_date
        question_ids: questionIds,
        question_count: samplerResult.questions.length,
        pack_count: samplerResult.packCount,
        error_book_count: samplerResult.errorBookCount,
        status: 'in_progress',
        started_at: now,
        answerable_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      })
      .select()
      .single();

    if (createError || !newMission) {
      console.error('[Mission Start] Create error:', createError);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CREATE_FAILED', message: createError?.message || 'Failed to create mission' },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Log mission start event
    await supabase.from('mission_logs').insert({
      user_mission_id: newMission.id,
      user_id: user.id,
      event_type: 'start',
      payload: {
        questionCount: samplerResult.questions.length,
        packCount: samplerResult.packCount,
        errorBookCount: samplerResult.errorBookCount,
        metadata: samplerResult.metadata,
      },
    });

    // Add questions to history
    await supabase.from('user_question_history').insert(
      samplerResult.questions.map(q => ({
        user_id: user.id,
        question_id: q.id,
        context: 'mission',
        shown_at: new Date().toISOString(),
      }))
    );

    const response: StartMissionResponse = {
      success: true,
      userMission: {
        ...transformUserMission(newMission),
        questions: samplerResult.questions.map(q => ({
          id: q.id,
          packId: q.packId,
          stem: q.stem,
          choices: q.choices,
          answer: q.answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          hasExplanation: q.hasExplanation,
          skill: q.skill,
        })),
      },
      message: `Mission created with ${samplerResult.questions.length} questions`,
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Mission Start API] Error:', error);
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

/**
 * Get questions for mission (from pack_questions)
 */
async function getQuestionsForMission(supabase: any, questionIds: string[]) {
  const { data: questions } = await supabase
    .from('pack_questions')
    .select('id, pack_id, stem, choices, answer, explanation, difficulty, has_explanation, packs(skill)')
    .in('id', questionIds);

  return (questions || []).map((q: any) => ({
    id: q.id,
    packId: q.pack_id,
    stem: q.stem,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    hasExplanation: q.has_explanation,
    skill: q.packs?.skill,
  }));
}

/**
 * Transform database user_mission to UserMission type
 */
function transformUserMission(mission: any) {
  return {
    id: mission.id,
    userId: mission.user_id,
    missionId: mission.mission_id,
    missionDate: mission.mission_date,
    questionIds: mission.question_ids,
    questionCount: mission.question_count,
    packCount: mission.pack_count,
    errorBookCount: mission.error_book_count,
    status: mission.status,
    correctCount: mission.correct_count,
    totalAnswered: mission.total_answered,
    startedAt: mission.started_at,
    completedAt: mission.completed_at,
    timeSpentSeconds: mission.time_spent_seconds,
    createdAt: mission.created_at,
    updatedAt: mission.updated_at,
  };
}
