import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PackListResponse, PackWithStatus } from '@plms/shared/types';
import { getConfidenceBadge } from '@plms/shared/types';

/**
 * GET /api/packs
 *
 * Browse and search packs with filters
 * Public endpoint (requires auth to see installation status)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');
    const skill = searchParams.get('skill');
    const grade = searchParams.get('grade');
    const source = searchParams.get('source'); // V2: Source filter
    const hasExplanation = searchParams.get('hasExplanation');
    const confidenceBadge = searchParams.get('confidenceBadge');
    const sortBy = searchParams.get('sortBy') || 'latest';
    const search = searchParams.get('search');

    const supabase = createClient();

    // Get current user (optional - to check installation status)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build query (V2: Added visibility check)
    let query = supabase
      .from('packs')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .eq('visibility', 'public') // V2: Only show public packs
      .gte('item_count', 20); // Minimum 20 items

    // Apply filters
    if (subject) query = query.eq('subject', subject);
    if (topic) query = query.eq('topic', topic);
    if (skill) query = query.eq('skill', skill);
    if (grade) query = query.eq('grade', grade);
    if (source) query = query.eq('source', source); // V2: Source filter
    if (hasExplanation === 'true') query = query.eq('has_explanation', true);

    // Confidence badge filter
    if (confidenceBadge === 'high') query = query.gte('avg_confidence', 0.85);
    else if (confidenceBadge === 'mid') query = query.gte('avg_confidence', 0.7).lt('avg_confidence', 0.85);
    else if (confidenceBadge === 'low') query = query.lt('avg_confidence', 0.7);

    // Search in title/description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Check not expired
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    // Sorting
    if (sortBy === 'popular') {
      query = query.order('install_count', { ascending: false });
    } else if (sortBy === 'confidence') {
      query = query.order('avg_confidence', { ascending: false });
    } else {
      // Default: latest
      query = query.order('published_at', { ascending: false, nullsLast: true });
    }

    // Pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: packs, error, count } = await query;

    if (error) {
      console.error('[Packs API] Query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'QUERY_FAILED', message: error.message },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Get user's installed packs
    let installedPackIds: string[] = [];
    if (user) {
      const { data: installations } = await supabase
        .from('user_pack_installations')
        .select('pack_id')
        .eq('user_id', user.id);

      installedPackIds = installations?.map(i => i.pack_id) || [];
    }

    // Transform to PackWithStatus (V2: Added source fields)
    const packsWithStatus: PackWithStatus[] = (packs || []).map(pack => ({
      id: pack.id,
      title: pack.title,
      description: pack.description,
      subject: pack.subject,
      topic: pack.topic,
      skill: pack.skill,
      grade: pack.grade,
      itemCount: pack.item_count,
      hasExplanation: pack.has_explanation,
      explanationRate: pack.explanation_rate,
      avgConfidence: pack.avg_confidence,
      confidenceBadge: getConfidenceBadge(pack.avg_confidence),
      status: pack.status,
      visibility: pack.visibility || 'public', // V2
      source: pack.source || 'internal', // V2
      sourceName: pack.source_name, // V2
      sourceId: pack.source_id, // V2
      publishedAt: pack.published_at,
      expiresAt: pack.expires_at,
      installCount: pack.install_count,
      completionRate: pack.completion_rate || 0,
      qrAlias: pack.qr_alias,
      createdAt: pack.created_at,
      updatedAt: pack.updated_at,
      createdBy: pack.created_by,
      isInstalled: installedPackIds.includes(pack.id),
      installedAt: undefined, // Will be filled if needed
    }));

    const response: PackListResponse = {
      packs: packsWithStatus,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > offset + pageSize,
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Packs API] Error:', error);
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
