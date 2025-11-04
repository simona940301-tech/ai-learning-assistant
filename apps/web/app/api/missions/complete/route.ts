import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CompleteMissionRequest, CompleteMissionResponse } from '@plms/shared/types';
import { CompleteMissionRequestSchema, calculateAccuracy } from '@plms/shared/types';

/**
 * POST /api/missions/complete
 *
 * Complete a mission and save results
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
    const validated = CompleteMissionRequestSchema.parse(body);

    // Get mission
    const { data: mission, error: missionError } = await supabase
      .from('user_missions')
      .select('*')
      .eq('id', validated.userMissionId)
      .eq('user_id', user.id)
      .single();

    if (missionError || !mission) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'MISSION_NOT_FOUND', message: 'Mission not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (mission.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_COMPLETED', message: 'Mission already completed' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Complete mission
    await supabase.rpc('complete_mission', {
      p_user_mission_id: validated.userMissionId,
      p_time_spent_seconds: validated.timeSpentSeconds,
    });

    // Get updated mission
    const { data: updatedMission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('id', validated.userMissionId)
      .single();

    // Log complete event
    await supabase.from('mission_logs').insert({
      user_mission_id: validated.userMissionId,
      user_id: user.id,
      event_type: 'complete',
      payload: {
        correctCount: updatedMission.correct_count,
        totalQuestions: updatedMission.question_count,
        accuracy: calculateAccuracy(updatedMission.correct_count, updatedMission.question_count),
        timeSpentSeconds: validated.timeSpentSeconds,
      },
    });

    const response: CompleteMissionResponse = {
      success: true,
      userMission: transformUserMission(updatedMission),
      summary: {
        correctCount: updatedMission.correct_count,
        totalQuestions: updatedMission.question_count,
        accuracy: calculateAccuracy(updatedMission.correct_count, updatedMission.question_count),
        timeSpentSeconds: validated.timeSpentSeconds,
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Mission Complete API] Error:', error);
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
