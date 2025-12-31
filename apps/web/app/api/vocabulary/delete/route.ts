import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getApiUser } from '@/lib/api/auth';
import { backpackCache } from '@/lib/cache/backpack-cache';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/vocabulary/delete
 * 
 * Delete a vocabulary word from notebook_entries.
 * Requires authentication.
 */
export async function DELETE(request: NextRequest) {
    try {
        // Authentication required
        const { user, errorType } = await getApiUser(request);

        if (!user) {
            const message =
                errorType === 'invalid-jwt'
                    ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
                    : errorType === 'unauthenticated'
                        ? 'Authentication required'
                        : 'Authentication error occurred';

            return NextResponse.json(
                {
                    error: 'UNAUTHORIZED',
                    message,
                    errorType,
                },
                { status: 401 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                {
                    error: 'INVALID_INPUT',
                    message: '請提供要刪除的單字 ID',
                },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient(request);

        // Delete from notebook_entries
        const { error: deleteError } = await supabase
            .from('notebook_entries')
            .delete()
            .eq('user_id', user.id)
            .eq('id', id)
            .eq('source_type', 'vocabulary'); // Extra safety check

        if (deleteError) {
            console.error('[vocabulary/delete] Error:', deleteError);
            return NextResponse.json(
                {
                    error: 'DATABASE_ERROR',
                    message: '刪除失敗',
                },
                { status: 500 }
            );
        }

        // Invalidate cache
        await backpackCache.invalidate(user.id);

        return NextResponse.json({
            success: true,
            message: '已刪除單字',
        });

    } catch (error) {
        console.error('[vocabulary/delete] Unexpected error:', error);
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
