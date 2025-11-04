import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UninstallPackRequest } from '@plms/shared/types';
import { UninstallPackRequestSchema } from '@plms/shared/types';

/**
 * POST /api/packs/uninstall
 *
 * Uninstall pack from user's library
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
    const validated = UninstallPackRequestSchema.parse(body);
    const { packId } = validated;

    // Check if pack is installed
    const { data: installation, error: checkError } = await supabase
      .from('user_pack_installations')
      .select('id')
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .single();

    if (checkError || !installation) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_INSTALLED', message: 'Pack is not installed' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Delete installation
    const { error: deleteError } = await supabase
      .from('user_pack_installations')
      .delete()
      .eq('user_id', user.id)
      .eq('pack_id', packId);

    if (deleteError) {
      console.error('[Pack Uninstall] Delete error:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNINSTALL_FAILED', message: deleteError.message },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Decrement install count (optional - depends on whether you want to track uninstalls)
    await supabase.rpc('decrement_pack_install_count', { pack_id: packId });

    return NextResponse.json({
      success: true,
      data: { success: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Pack Uninstall API] Error:', error);
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
