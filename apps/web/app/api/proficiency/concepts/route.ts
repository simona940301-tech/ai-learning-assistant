import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proficiency/concepts
 *
 * Retrieves concept-level proficiency data for the authenticated user
 * Includes SRS scheduling information
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dueOnly = searchParams.get('dueOnly') === 'true';
    const subject = searchParams.get('subject');
    const minMastery = searchParams.get('minMastery');
    const maxMastery = searchParams.get('maxMastery');

    let query = supabase
      .from('user_concept_proficiency')
      .select(`
        *,
        concept_tags (
          id,
          tag_name,
          category,
          subject,
          difficulty_level
        )
      `)
      .eq('user_id', user.id);

    // Filter by due date
    if (dueOnly) {
      query = query.lte('next_review_at', new Date().toISOString());
    }

    // Filter by subject
    if (subject) {
      // We need to join with concept_tags to filter by subject
      const { data: conceptTags } = await supabase
        .from('concept_tags')
        .select('id')
        .eq('subject', subject);

      if (conceptTags && conceptTags.length > 0) {
        const tagIds = conceptTags.map(t => t.id);
        query = query.in('concept_tag_id', tagIds);
      }
    }

    // Filter by mastery level
    if (minMastery) {
      query = query.gte('mastery_level', parseFloat(minMastery));
    }
    if (maxMastery) {
      query = query.lte('mastery_level', parseFloat(maxMastery));
    }

    query = query.order('mastery_level', { ascending: true });

    const { data: conceptProficiency, error } = await query;

    if (error) {
      console.error('Error fetching concept proficiency:', error);
      return NextResponse.json({ error: 'Failed to fetch concept proficiency' }, { status: 500 });
    }

    // Group by subject
    const bySubject = conceptProficiency?.reduce((acc, cp) => {
      const subjectName = (cp.concept_tags as any)?.subject || 'Unknown';
      if (!acc[subjectName]) {
        acc[subjectName] = [];
      }
      acc[subjectName].push(cp);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate statistics
    const stats = {
      totalConcepts: conceptProficiency?.length || 0,
      mastered: conceptProficiency?.filter(cp => cp.mastery_level >= 80).length || 0,
      learning: conceptProficiency?.filter(cp => cp.mastery_level >= 50 && cp.mastery_level < 80).length || 0,
      struggling: conceptProficiency?.filter(cp => cp.mastery_level < 50).length || 0,
      dueForReview: conceptProficiency?.filter(cp =>
        cp.next_review_at && new Date(cp.next_review_at) <= new Date()
      ).length || 0
    };

    return NextResponse.json({
      concepts: conceptProficiency || [],
      bySubject: bySubject || {},
      stats,
      message: 'Concept proficiency retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving concept proficiency:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proficiency/concepts
 *
 * Updates concept proficiency after a user answers a question
 * Uses SM-2 spaced repetition algorithm
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conceptTagIds, isCorrect, responseTimeMs } = body;

    if (!Array.isArray(conceptTagIds) || conceptTagIds.length === 0) {
      return NextResponse.json(
        { error: 'conceptTagIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (typeof isCorrect !== 'boolean') {
      return NextResponse.json(
        { error: 'isCorrect must be a boolean' },
        { status: 400 }
      );
    }

    // Update each concept
    const updatePromises = conceptTagIds.map(conceptTagId =>
      supabase.rpc('update_concept_proficiency', {
        p_user_id: user.id,
        p_concept_tag_id: conceptTagId,
        p_is_correct: isCorrect,
        p_response_time_ms: responseTimeMs || null
      })
    );

    await Promise.all(updatePromises);

    // Fetch updated proficiency
    const { data: updatedProficiency } = await supabase
      .from('user_concept_proficiency')
      .select(`
        *,
        concept_tags (
          id,
          tag_name,
          category,
          subject
        )
      `)
      .eq('user_id', user.id)
      .in('concept_tag_id', conceptTagIds);

    return NextResponse.json({
      updated: updatedProficiency || [],
      message: `Updated proficiency for ${conceptTagIds.length} concept(s)`
    });

  } catch (error) {
    console.error('Error updating concept proficiency:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
