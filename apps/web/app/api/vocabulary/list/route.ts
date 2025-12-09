import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getApiUser } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vocabulary/list
 * 
 * Fetch user's saved vocabulary words with stats and filtering.
 * 
 * Query params:
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 * - level: string (filter by level, e.g., "Lv1")
 * - sort: 'recent' | 'alphabetical' (default 'recent')
 * - search: string (search in title or content)
 * 
 * @returns {
 *   words: VocabularyWord[];
 *   total: number;
 *   stats: { total_words, this_week, by_level };
 * }
 */
export async function GET(request: NextRequest) {
    try {
        // Authentication required
        const { user, errorType } = await getApiUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const supabase = getSupabaseClient(request);
        const { searchParams } = new URL(request.url);

        // Parse query parameters
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        const level = searchParams.get('level');
        const sort = searchParams.get('sort') || 'recent';
        const search = searchParams.get('search');

        // Build query
        let query = supabase
            .from('notebook_entries')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('source_type', 'vocabulary');

        // Apply filters
        if (level) {
            query = query.contains('tags', [level.toLowerCase().replace(/\s+/g, '_')]);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,content_md.ilike.%${search}%`);
        }

        // Apply sorting
        if (sort === 'alphabetical') {
            query = query.order('title', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            throw error;
        }

        // Parse content_md JSON for each word
        const words = (data || []).map(entry => {
            let wordData;
            try {
                wordData = JSON.parse(entry.content_md);
            } catch {
                wordData = {};
            }

            return {
                id: entry.id,
                text: entry.title,
                definition_zh: wordData.definition_zh || '',
                example_en: wordData.example_en || '',
                pos: wordData.pos || '',
                level: wordData.level || '',
                lyric_snippet: wordData.lyric_snippet,
                source_session_id: entry.source_session_id,
                source_deck_type: entry.source_deck_type,
                source_timestamp: entry.source_timestamp,
                created_at: entry.created_at,
                updated_at: entry.updated_at,
            };
        });

        // Calculate stats
        const statsQuery = await supabase
            .from('notebook_entries')
            .select('tags, created_at')
            .eq('user_id', user.id)
            .eq('source_type', 'vocabulary');

        const allWords = statsQuery.data || [];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const stats = {
            total_words: allWords.length,
            this_week: allWords.filter(w => new Date(w.created_at) > oneWeekAgo).length,
            by_level: allWords.reduce((acc, w) => {
                const levelTag = w.tags?.find((t: string) => t.startsWith('lv') || t.startsWith('level'));
                if (levelTag) {
                    const level = levelTag.replace('level_', '').replace('lv', 'Lv');
                    acc[level] = (acc[level] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>),
        };

        return NextResponse.json({
            words,
            total: count || 0,
            stats,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[vocabulary/list] Error:', error);

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
