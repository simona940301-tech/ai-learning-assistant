import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, getApiUser } from '@/lib/api/auth';
import { backpackCache } from '@/lib/cache/backpack-cache';

export const dynamic = 'force-dynamic';

// Zod schema for delete request
const DeleteVocabularySchema = z.object({
    id: z.string().uuid(),
});

/**
 * DELETE /api/vocabulary/delete
 * 
 * Delete a vocabulary word from the notebook.
 * Validates user ownership before deletion.
 * 
 * @returns {
 *   success: boolean;
 *   deleted_word: { text: string };
 * }
 */
export async function DELETE(request: NextRequest) {
    try {
        // Authentication required
        const { user, errorType } = await getApiUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const parseResult = DeleteVocabularySchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(
                {
                    error: 'INVALID_REQUEST',
                    message: 'Invalid request format',
                    details: parseResult.error.errors,
                },
                { status: 400 }
            );
        }

        const { id } = parseResult.data;
        const supabase = getSupabaseClient(request);

        // First, fetch the word to get its text (for response)
        const { data: wordData, error: fetchError } = await supabase
            .from('notebook_entries')
            .select('title, user_id')
            .eq('id', id)
            .single();

        if (fetchError || !wordData) {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: 'Vocabulary word not found' },
                { status: 404 }
            );
        }

        // Verify ownership
        if (wordData.user_id !== user.id) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: 'You do not own this vocabulary word' },
                { status: 403 }
            );
        }

        // Delete the word
        const { error: deleteError } = await supabase
            .from('notebook_entries')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Double-check ownership

        if (deleteError) {
            throw deleteError;
        }

        // Invalidate cache
        await backpackCache.invalidate(user.id);

        return NextResponse.json({
            success: true,
            deleted_word: {
                text: wordData.title,
            },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[vocabulary/delete] Error:', error);

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
