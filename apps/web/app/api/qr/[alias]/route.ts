import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { QREntryResult, PackWithStatus } from '@plms/shared/types';
import { getConfidenceBadge, isPackExpired } from '@plms/shared/types';

/**
 * GET /api/qr/:alias
 *
 * QR code entry point with intelligent fallback
 * Handles: not found, expired, archived scenarios
 * Public endpoint (no auth required for viewing, auth required for installation status)
 */
export async function GET(req: NextRequest, { params }: { params: { alias: string } }) {
  try {
    const { alias } = params;
    const supabase = createClient();

    // Get current user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Try to find pack by QR alias
    const { data: pack, error } = await supabase
      .from('packs')
      .select('*')
      .eq('qr_alias', alias)
      .single();

    // Helper function to transform pack to PackWithStatus
    const transformPack = async (p: any): Promise<PackWithStatus> => {
      let isInstalled = false;
      let installedAt: string | undefined;

      if (user) {
        const { data: installation } = await supabase
          .from('user_pack_installations')
          .select('installed_at')
          .eq('user_id', user.id)
          .eq('pack_id', p.id)
          .single();

        if (installation) {
          isInstalled = true;
          installedAt = installation.installed_at;
        }
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        subject: p.subject,
        topic: p.topic,
        skill: p.skill,
        grade: p.grade,
        itemCount: p.item_count,
        hasExplanation: p.has_explanation,
        explanationRate: p.explanation_rate,
        avgConfidence: p.avg_confidence,
        confidenceBadge: getConfidenceBadge(p.avg_confidence),
        status: p.status,
        publishedAt: p.published_at,
        expiresAt: p.expires_at,
        installCount: p.install_count,
        completionRate: p.completion_rate || 0,
        qrAlias: p.qr_alias,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        createdBy: p.created_by,
        isInstalled,
        installedAt,
      };
    };

    // Helper function to get fallback suggestions
    const getFallbackSuggestions = async (
      topic?: string,
      skill?: string,
      subject?: string
    ): Promise<PackWithStatus[]> => {
      let query = supabase
        .from('packs')
        .select('*')
        .eq('status', 'published')
        .gte('item_count', 20)
        .order('avg_confidence', { ascending: false })
        .limit(3);

      // Prioritize same topic, then skill, then subject
      if (topic) {
        query = query.eq('topic', topic);
      } else if (skill) {
        query = query.eq('skill', skill);
      } else if (subject) {
        query = query.eq('subject', subject);
      }

      // Also check not expired
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      const { data: suggestions } = await query;

      if (!suggestions || suggestions.length === 0) {
        // Fallback to just high confidence packs in same subject
        const { data: generalSuggestions } = await supabase
          .from('packs')
          .select('*')
          .eq('status', 'published')
          .gte('item_count', 20)
          .gte('avg_confidence', 0.85)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .limit(3);

        return Promise.all((generalSuggestions || []).map(transformPack));
      }

      return Promise.all(suggestions.map(transformPack));
    };

    // Case 1: Pack not found
    if (error || !pack) {
      const result: QREntryResult = {
        found: false,
        fallback: {
          reason: 'not_found',
          suggestedPacks: await getFallbackSuggestions(),
          message: `找不到QR碼對應的題包。以下是為您推薦的其他題包：`,
        },
      };

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    // Case 2: Pack is expired
    if (isPackExpired(pack)) {
      const result: QREntryResult = {
        found: false,
        pack: await transformPack(pack),
        fallback: {
          reason: 'expired',
          suggestedPacks: await getFallbackSuggestions(pack.topic, pack.skill, pack.subject),
          message: `「${pack.title}」已過期。以下是同主題的推薦題包：`,
        },
      };

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    // Case 3: Pack is archived (delisted)
    if (pack.status === 'archived') {
      const result: QREntryResult = {
        found: false,
        pack: await transformPack(pack),
        fallback: {
          reason: 'archived',
          suggestedPacks: await getFallbackSuggestions(pack.topic, pack.skill, pack.subject),
          message: `「${pack.title}」已下架。以下是同主題的推薦題包：`,
        },
      };

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    // Case 4: Pack is draft or not published
    if (pack.status !== 'published') {
      const result: QREntryResult = {
        found: false,
        pack: await transformPack(pack),
        fallback: {
          reason: 'archived', // Treat as archived
          suggestedPacks: await getFallbackSuggestions(pack.topic, pack.skill, pack.subject),
          message: `「${pack.title}」尚未發布。以下是同主題的推薦題包：`,
        },
      };

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    // Case 5: Pack found and available
    const result: QREntryResult = {
      found: true,
      pack: await transformPack(pack),
    };

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[QR Entry API] Error:', error);
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
