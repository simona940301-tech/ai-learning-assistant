import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient, getApiUser } from '@/lib/api/auth';
import { backpackCache } from '@/lib/cache/backpack-cache';

export const dynamic = 'force-dynamic';

// Zod schema for batch vocabulary save
const BatchSaveVocabularySchema = z.object({
    words: z.array(z.object({
        id: z.string(),
        text: z.string().min(1),
        definition_zh: z.string(),
        example_en: z.string(),
        pos: z.string(), // Part of speech
        level: z.string(),
        lyric_snippet: z.object({
            artist: z.string().optional().nullable(),
            song: z.string().optional().nullable(),
            line: z.string().optional().nullable(),
        }).optional().nullable(),
    })).min(1).max(50), // Limit to 50 words per batch
    session_id: z.string().min(1),
    deck_type: z.enum(['lyrical_flow', 'battle', 'practice']),
});

type BatchSaveRequest = z.infer<typeof BatchSaveVocabularySchema>;

interface SaveResult {
    word: string;
    status: 'saved' | 'skipped';
    reason?: string;
    id?: string;
}

/**
 * POST /api/vocabulary/batch-save
 * 
 * Batch save vocabulary words to notebook_entries with source tracking.
 * Uses upsert to avoid duplicates based on user_id + title (word text).
 * 
 * @returns {
 *   success: boolean;
 *   saved: number;
 *   skipped: number;
 *   total: number;
 *   details: SaveResult[];
 * }
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    console.log('[batch-save] Request received');

    try {
        // Authentication required
        const { user, errorType } = await getApiUser(request);

        if (!user) {
            console.error('[batch-save] Auth error:', errorType);
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

        // Parse and validate request body
        const body = await request.json();
        // console.log('[batch-save] Payload:', JSON.stringify(body, null, 2)); // Debug log

        const parseResult = BatchSaveVocabularySchema.safeParse(body);

        if (!parseResult.success) {
            console.error('[batch-save] Validation error:', parseResult.error);
            return NextResponse.json(
                {
                    error: 'INVALID_REQUEST',
                    message: 'Invalid request format',
                    details: parseResult.error.errors,
                },
                { status: 400 }
            );
        }

        const { words, session_id, deck_type } = parseResult.data;
        const supabase = getSupabaseClient(request);

        // Track results for each word
        const results: SaveResult[] = [];
        let savedCount = 0;
        let skippedCount = 0;

        // Process each word with upsert
        for (const word of words) {
            try {
                // Prepare vocabulary entry data
                const vocabularyEntry = {
                    user_id: user.id,
                    title: word.text, // Word text as title
                    content_md: JSON.stringify({
                        text: word.text,
                        definition_zh: word.definition_zh,
                        example_en: word.example_en,
                        pos: word.pos,
                        level: word.level,
                        lyric_snippet: word.lyric_snippet,
                    }),
                    source_type: 'vocabulary',
                    tags: ['english', 'vocabulary', word.level.toLowerCase().replace(/\s+/g, '_')],
                    source_session_id: session_id,
                    source_deck_type: deck_type,
                    source_timestamp: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                // Upsert: insert or update if exists (based on user_id + title)
                const { data, error } = await supabase
                    .from('notebook_entries')
                    .upsert(vocabularyEntry, {
                        onConflict: 'user_id,title',
                        ignoreDuplicates: false, // Update if exists
                    })
                    .select('id')
                    .single();

                if (error) {
                    // Check if it's a duplicate (already exists)
                    if (error.code === '23505') {
                        results.push({
                            word: word.text,
                            status: 'skipped',
                            reason: 'already_saved',
                        });
                        skippedCount++;
                    } else {
                        console.error(`[batch-save] Supabase error for "${word.text}":`, error);
                        throw error;
                    }
                } else {
                    results.push({
                        word: word.text,
                        status: 'saved',
                        id: data.id,
                    });
                    savedCount++;
                }
            } catch (wordError) {
                console.error(`[batch-save] Error saving word "${word.text}":`, wordError);
                results.push({
                    word: word.text,
                    status: 'skipped',
                    reason: 'error',
                });
                skippedCount++;
            }
        }

        // Invalidate cache after mutations
        await backpackCache.invalidate(user.id);

        const latency = Date.now() - startTime;
        console.log(`[batch-save] Success: ${savedCount} saved, ${skippedCount} skipped`);

        return NextResponse.json({
            success: true,
            saved: savedCount,
            skipped: skippedCount,
            total: words.length,
            details: results,
            latency,
        });

    } catch (error) {
        const latency = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[batch-save] Fatal Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                latency,
            },
            { status: 500 }
        );
    }
}
