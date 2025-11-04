import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { InstallPackRequest, InstallPackResponse } from '@plms/shared/types';
import { InstallPackRequestSchema } from '@plms/shared/types';

/**
 * POST /api/packs/install
 *
 * Install pack to user's library
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

    // Parse and validate request
    const body = await req.json();
    const validated = InstallPackRequestSchema.parse(body);
    const { packId, source, listPosition } = validated;

    // Check if pack exists and is published
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('id, status, item_count, expires_at')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PACK_NOT_FOUND', message: 'Pack not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    if (pack.status !== 'published') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PACK_NOT_AVAILABLE', message: 'Pack is not available for installation' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (pack.item_count < 20) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PACK_TOO_SMALL',
            message: 'Pack does not meet minimum item count (20)',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if expired
    if (pack.expires_at && new Date(pack.expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PACK_EXPIRED', message: 'Pack has expired' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check if already installed
    const { data: existing } = await supabase
      .from('user_pack_installations')
      .select('id')
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'ALREADY_INSTALLED', message: 'Pack is already installed' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Install pack
    const installedAt = new Date().toISOString();
    const { error: insertError } = await supabase.from('user_pack_installations').insert({
      user_id: user.id,
      pack_id: packId,
      installed_at: installedAt,
      source,
      list_position: listPosition,
    });

    if (insertError) {
      console.error('[Pack Install] Insert error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INSTALL_FAILED', message: insertError.message },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Increment install count
    await supabase.rpc('increment_pack_install_count', { pack_id: packId });

    const response: InstallPackResponse = {
      success: true,
      packId,
      installedAt,
      message: 'Pack installed successfully',
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Pack Install API] Error:', error);
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
