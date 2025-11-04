import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PackWithStatus } from '@plms/shared/types';
import { getConfidenceBadge } from '@plms/shared/types';

/**
 * GET /api/packs/installed
 *
 * Get user's installed packs
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

    // Get user's installations with pack details
    const { data: installations, error } = await supabase
      .from('user_pack_installations')
      .select(
        `
        installed_at,
        source,
        list_position,
        packs (*)
      `
      )
      .eq('user_id', user.id)
      .order('installed_at', { ascending: false });

    if (error) {
      console.error('[Installed Packs API] Query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'QUERY_FAILED', message: error.message },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Transform to PackWithStatus
    const packsWithStatus: PackWithStatus[] = (installations || [])
      .filter(inst => inst.packs) // Filter out any null packs
      .map(inst => {
        const pack = Array.isArray(inst.packs) ? inst.packs[0] : inst.packs;
        return {
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
          publishedAt: pack.published_at,
          expiresAt: pack.expires_at,
          installCount: pack.install_count,
          completionRate: pack.completion_rate || 0,
          qrAlias: pack.qr_alias,
          createdAt: pack.created_at,
          updatedAt: pack.updated_at,
          createdBy: pack.created_by,
          isInstalled: true,
          installedAt: inst.installed_at,
        };
      });

    return NextResponse.json({
      success: true,
      data: packsWithStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Installed Packs API] Error:', error);
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
