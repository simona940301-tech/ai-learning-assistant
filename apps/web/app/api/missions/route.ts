import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GetMissionsResponse, UserMission } from '@plms/shared/types';

/**
 * GET /api/missions
 *
 * Get user's missions (today + recent + streak)
 * Requires authentication
 */
export async function GET(req: NextRequest) {
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

    // Get today's mission
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: todayMission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', user.id)
      .eq('mission_date', today)
      .single();

    // Get recent missions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentMissions } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', user.id)
      .gte('mission_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('mission_date', { ascending: false })
      .limit(7);

    // Calculate streak (consecutive days with completed missions)
    const { data: completedMissions } = await supabase
      .from('user_missions')
      .select('mission_date')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('mission_date', { ascending: false })
      .limit(30); // Check last 30 days for streak

    let streak = 0;
    if (completedMissions && completedMissions.length > 0) {
      const dates = completedMissions.map(m => m.mission_date);
      let currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday

      for (const mission of completedMissions) {
        const missionDate = new Date(mission.mission_date);
        const expectedDate = currentDate.toISOString().split('T')[0];

        if (missionDate.toISOString().split('T')[0] === expectedDate) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Count total completed
    const { count: totalCompleted } = await supabase
      .from('user_missions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // Transform to response type
    const response: GetMissionsResponse = {
      today: todayMission ? transformUserMission(todayMission) : undefined,
      recent: (recentMissions || []).map(transformUserMission),
      streak,
      totalCompleted: totalCompleted || 0,
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Missions API] Error:', error);
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
function transformUserMission(mission: any): UserMission {
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
