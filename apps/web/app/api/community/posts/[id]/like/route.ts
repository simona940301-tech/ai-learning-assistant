import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/posts/[id]/like
 * Toggle like on a post
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();

        // Verify authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '請先登入' },
                { status: 401 }
            );
        }

        const { id } = params;

        // Get current post data
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('liked_by, likes')
            .eq('id', id)
            .single();

        if (fetchError || !post) {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: '貼文不存在' },
                { status: 404 }
            );
        }

        const likedBy = post.liked_by || [];
        const currentLikes = post.likes || 0;
        const hasLiked = likedBy.includes(user.id);

        let newLikedBy: string[];
        let newLikes: number;

        if (hasLiked) {
            // Unlike: remove user from liked_by array
            newLikedBy = likedBy.filter((uid: string) => uid !== user.id);
            newLikes = Math.max(0, currentLikes - 1);
        } else {
            // Like: add user to liked_by array
            newLikedBy = [...likedBy, user.id];
            newLikes = currentLikes + 1;
        }

        // Update the post with atomic operation
        const { data: updatedPost, error: updateError } = await supabase
            .from('posts')
            .update({
                liked_by: newLikedBy,
                likes: newLikes,
            })
            .eq('id', id)
            .select('id, likes, liked_by')
            .single();

        if (updateError) {
            console.error('[Like Post] Database error:', updateError);
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '操作失敗' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            liked: !hasLiked,
            likes: updatedPost.likes,
            message: hasLiked ? '已取消按讚' : '已按讚',
        });
    } catch (error) {
        console.error('[Like Post] Unexpected error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
            { status: 500 }
        );
    }
}
