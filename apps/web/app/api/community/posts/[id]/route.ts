import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/posts/[id]
 * Get a single post by ID
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { id } = params;

        const { data: post, error } = await supabase
            .from('posts')
            .select(`
        id,
        user_id,
        content,
        images,
        likes,
        liked_by,
        is_anonymous,
        question_metadata,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
            .eq('id', id)
            .single();

        if (error || !post) {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: '貼文不存在' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error('[Get Post] Error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/community/posts/[id]
 * Update a post (only by the author)
 */
export async function PATCH(
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
        const body = await req.json();
        const { content, images } = body;

        // Validate input
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json(
                { error: 'INVALID_INPUT', message: '請輸入內容' },
                { status: 400 }
            );
        }

        // Validate images if provided
        if (images !== undefined) {
            if (!Array.isArray(images)) {
                return NextResponse.json(
                    { error: 'INVALID_INPUT', message: '圖片格式錯誤' },
                    { status: 400 }
                );
            }

            if (images.length > 4) {
                return NextResponse.json(
                    { error: 'INVALID_INPUT', message: '最多只能上傳 4 張圖片' },
                    { status: 400 }
                );
            }

            // Validate image URLs
            const invalidImages = images.filter(
                (url: string) => !url.includes('/community_images/')
            );
            if (invalidImages.length > 0) {
                return NextResponse.json(
                    { error: 'INVALID_INPUT', message: '圖片來源無效' },
                    { status: 400 }
                );
            }
        }

        // Check if post exists and user is the author
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !existingPost) {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: '貼文不存在' },
                { status: 404 }
            );
        }

        if (existingPost.user_id !== user.id) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: '您沒有權限編輯此貼文' },
                { status: 403 }
            );
        }

        // Update the post
        const updateData: any = {
            content: content.trim(),
            updated_at: new Date().toISOString(),
        };

        if (images !== undefined) {
            updateData.images = images;
        }

        const { data: updatedPost, error: updateError } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('[Update Post] Database error:', updateError);
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '更新失敗' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            post: updatedPost,
            message: '貼文已更新',
        });
    } catch (error) {
        console.error('[Update Post] Unexpected error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/community/posts/[id]
 * Delete a post (only by the author)
 */
export async function DELETE(
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

        // Check if post exists and user is the author
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('user_id, images')
            .eq('id', id)
            .single();

        if (fetchError || !existingPost) {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: '貼文不存在' },
                { status: 404 }
            );
        }

        if (existingPost.user_id !== user.id) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: '您沒有權限刪除此貼文' },
                { status: 403 }
            );
        }

        // Delete the post
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Delete Post] Database error:', deleteError);
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '刪除失敗' },
                { status: 500 }
            );
        }

        // Optionally delete associated images from storage
        // This is a background task, don't wait for it
        if (existingPost.images && existingPost.images.length > 0) {
            const imagePaths = existingPost.images.map((url: string) => {
                // Extract path from URL
                const match = url.match(/community_images\/(.+)$/);
                return match ? match[1] : null;
            }).filter(Boolean);

            if (imagePaths.length > 0) {
                supabase.storage
                    .from('community_images')
                    .remove(imagePaths)
                    .catch(err => console.error('[Delete Post] Failed to delete images:', err));
            }
        }

        return NextResponse.json({
            success: true,
            message: '貼文已刪除',
        });
    } catch (error) {
        console.error('[Delete Post] Unexpected error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
            { status: 500 }
        );
    }
}
