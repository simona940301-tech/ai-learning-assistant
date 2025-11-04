import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PackWithStatus } from '@plms/shared/types';
import { getConfidenceBadge } from '@plms/shared/types';

/**
 * GET /api/packs/:id
 *
 * Get pack details by ID
 * Public endpoint (requires auth to see installation status)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = createClient();

    // Get current user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get pack
    const { data: pack, error } = await supabase
      .from('packs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !pack) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PACK_NOT_FOUND', message: 'Pack not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Check if user has installed this pack
    let isInstalled = false;
    let installedAt: string | undefined;

    if (user) {
      const { data: installation } = await supabase
        .from('user_pack_installations')
        .select('installed_at')
        .eq('user_id', user.id)
        .eq('pack_id', id)
        .single();

      if (installation) {
        isInstalled = true;
        installedAt = installation.installed_at;
      }
    }

    // Transform to PackWithStatus
    const packWithStatus: PackWithStatus = {
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
      isInstalled,
      installedAt,
    };

    return NextResponse.json({
      success: true,
      data: packWithStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Pack Detail API] Error:', error);
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
