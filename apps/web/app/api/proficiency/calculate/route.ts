import { createClient } from '@/lib/supabase/server';
import { calculateProficiency } from '@/lib/proficiency-calculator';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/proficiency/calculate
 *
 * Calculates and stores user proficiency based on multiple data sources:
 * - Self-reported level
 * - Onboarding challenge results
 * - Battle history and ELO
 * - Recent practice performance
 *
 * This is the unified endpoint for all proficiency calculations
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { forceRecalculate = false } = body;

    // Check if we have a recent calculation (within last hour) and not forcing
    if (!forceRecalculate) {
      const { data: recentProficiency } = await supabase
        .from('user_proficiency')
        .select('*')
        .eq('user_id', user.id)
        .gte('calculated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (recentProficiency) {
        return NextResponse.json({
          proficiency: recentProficiency,
          cached: true,
          message: 'Using cached proficiency calculation'
        });
      }
    }

    // Gather all data sources
    const [profileData, challengeData, battleData, practiceData] = await Promise.all([
      // 1. Get user profile (self-reported level)
      supabase
        .from('profiles')
        .select('level, goal_university, goal_department')
        .eq('id', user.id)
        .single(),

      // 2. Get onboarding challenge results
      supabase
        .from('profiles')
        .select('onboarding_challenge_results')
        .eq('id', user.id)
        .single(),

      // 3. Get battle statistics
      supabase
        .from('profiles')
        .select('battle_rating')
        .eq('id', user.id)
        .single(),

      // 4. Get recent practice performance (last 30 days)
      supabase
        .from('user_answers')
        .select('is_correct, created_at, metadata')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    // Extract data
    const profile = profileData.data;
    const challengeResults = challengeData.data?.onboarding_challenge_results as any;
    const battleRating = battleData.data?.battle_rating || 1000;
    const recentAnswers = practiceData.data || [];

    // Calculate proficiency using our proficiency calculator
    const proficiencyData = calculateProficiency({
      mock_exam_level: profile?.level || 3,
      challenge_score: Array.isArray(challengeResults) ? challengeResults.filter((r: any) => r.isCorrect).length : 0,
      challenge_results: Array.isArray(challengeResults) ? challengeResults : [],
      battle_history: recentAnswers.slice(0, 50).map(a => ({
        isCorrect: a.is_correct,
        difficulty: 3 // Default difficulty
      }))
    });

    // Calculate component scores
    const totalQuestions = recentAnswers.length;
    const correctAnswers = recentAnswers.filter(a => a.is_correct).length;
    const accuracyRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Calculate average response time
    const responseTimes = recentAnswers
      .map(a => (a.metadata as any)?.response_time_ms)
      .filter(t => t && t > 0);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length)
      : null;

    // Calculate consistency score (lower variance = higher consistency)
    let consistencyScore = 50; // Default
    if (recentAnswers.length >= 10) {
      const recentAccuracies = [];
      const chunkSize = 5;
      for (let i = 0; i < recentAnswers.length; i += chunkSize) {
        const chunk = recentAnswers.slice(i, i + chunkSize);
        const chunkAccuracy = chunk.filter(a => a.is_correct).length / chunk.length;
        recentAccuracies.push(chunkAccuracy);
      }

      const mean = recentAccuracies.reduce((sum, acc) => sum + acc, 0) / recentAccuracies.length;
      const variance = recentAccuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / recentAccuracies.length;
      const stdDev = Math.sqrt(variance);

      // Convert to 0-100 scale (lower stdDev = higher consistency)
      consistencyScore = Math.max(0, Math.min(100, (1 - stdDev) * 100));
    }

    // Store proficiency record
    const { data: proficiencyRecord, error: insertError } = await supabase
      .from('user_proficiency')
      .insert({
        user_id: user.id,
        overall_proficiency: proficiencyData.proficiency,
        self_reported_level: profile?.level || null,
        challenge_score: proficiencyData.breakdown.testPerformance,
        battle_elo: battleRating,
        accuracy_rate: accuracyRate,
        average_response_time_ms: avgResponseTime,
        consistency_score: consistencyScore,
        calculation_method: 'weighted_composite',
        data_points_count: totalQuestions,
        confidence_level: Math.min(100, totalQuestions * 2), // More data = higher confidence
        has_dunning_kruger_effect: Math.abs(proficiencyData.breakdown.selfReported - proficiencyData.breakdown.testPerformance) > 30,
        self_test_gap: Math.abs(proficiencyData.breakdown.selfReported - proficiencyData.breakdown.testPerformance),
        calculated_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Valid for 24 hours
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting proficiency:', insertError);
      return NextResponse.json({ error: 'Failed to store proficiency' }, { status: 500 });
    }

    // Also update subject-specific proficiency
    const subjectGroups = recentAnswers.reduce((acc, answer) => {
      const subject = (answer.metadata as any)?.subject || 'Unknown';
      if (!acc[subject]) {
        acc[subject] = { correct: 0, total: 0, times: [] };
      }
      acc[subject].total++;
      if (answer.is_correct) acc[subject].correct++;
      const time = (answer.metadata as any)?.response_time_ms;
      if (time) acc[subject].times.push(time);
      return acc;
    }, {} as Record<string, { correct: number; total: number; times: number[] }>);

    const subjectProficiencyPromises = Object.entries(subjectGroups).map(([subject, data]) => {
      const subjectAccuracy = (data.correct / data.total) * 100;
      const avgTime = data.times.length > 0
        ? Math.round(data.times.reduce((sum, t) => sum + t, 0) / data.times.length)
        : null;

      return supabase
        .from('user_subject_proficiency')
        .upsert({
          user_id: user.id,
          subject,
          proficiency_score: subjectAccuracy,
          accuracy_rate: subjectAccuracy,
          total_questions_attempted: data.total,
          correct_answers: data.correct,
          average_response_time_ms: avgTime,
          last_updated: new Date().toISOString()
        }, { onConflict: 'user_id,subject' });
    });

    await Promise.all(subjectProficiencyPromises);

    return NextResponse.json({
      proficiency: proficiencyRecord,
      breakdown: {
        overall: proficiencyData.proficiency,
        challengeScore: proficiencyData.breakdown.testPerformance,
        accuracy: accuracyRate,
        consistency: consistencyScore,
        dataPoints: totalQuestions,
        hasDunningKruger: Math.abs(proficiencyData.breakdown.selfReported - proficiencyData.breakdown.testPerformance) > 30
      },
      cached: false,
      message: 'Proficiency calculated successfully'
    });

  } catch (error) {
    console.error('Error calculating proficiency:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/proficiency/calculate
 *
 * Retrieves the latest proficiency calculation for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest proficiency
    const { data: proficiency, error } = await supabase
      .rpc('get_latest_user_proficiency', { p_user_id: user.id });

    if (error) {
      console.error('Error fetching proficiency:', error);
      return NextResponse.json({ error: 'Failed to fetch proficiency' }, { status: 500 });
    }

    if (!proficiency || proficiency.length === 0) {
      return NextResponse.json({
        proficiency: null,
        message: 'No proficiency data found. Please complete the onboarding challenge or practice some questions.'
      });
    }

    // Get subject-specific proficiency
    const { data: subjectProficiency } = await supabase
      .from('user_subject_proficiency')
      .select('*')
      .eq('user_id', user.id);

    return NextResponse.json({
      proficiency: proficiency[0],
      subjectBreakdown: subjectProficiency || [],
      message: 'Proficiency retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving proficiency:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
