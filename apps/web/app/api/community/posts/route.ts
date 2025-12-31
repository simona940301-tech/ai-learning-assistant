import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/community/posts
 * 
 * 獲取 community 貼文列表
 * 
 * Query params:
 * - limit?: number - 限制數量（預設 20）
 * - offset?: number - 偏移量（預設 0）
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user (optional for public feed)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor'); // Cursor-based pagination

    // Build query - make liked_by optional for backward compatibility
    let query = supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        images,
        likes,
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
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply cursor if provided
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error: postsError } = await query;

    console.log('[Community Posts] Query result:', { postsCount: posts?.length, postsError });

    // If table doesn't exist or other error, return empty array (graceful degradation)
    if (postsError) {
      console.error('[Community Posts] Database error:', postsError);

      // If table doesn't exist, return empty array
      if (postsError.code === '42P01' || postsError.message?.includes('does not exist')) {
        console.warn('[Community Posts] Posts table does not exist, returning empty array');
        return NextResponse.json({
          success: true,
          posts: [],
          total: 0,
          nextCursor: null,
        });
      }

      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: `獲取貼文失敗: ${postsError.message}` },
        { status: 500 }
      );
    }

    // Format post data
    const formattedPosts = posts?.map((post: any) => {
      const profile = post.profiles;
      const isAnonymous = post.is_anonymous || false;
      const questionMetadata = post.question_metadata || null;
      // Handle missing liked_by column (for backward compatibility)
      const likedBy = Array.isArray(post.liked_by) ? post.liked_by : [];
      const isLikedByMe = user && likedBy.length > 0 ? likedBy.includes(user.id) : false;

      return {
        id: post.id,
        content: post.content,
        images: post.images || [],
        likes: post.likes || 0,
        is_liked_by_me: isLikedByMe,
        created_at: post.created_at,
        updated_at: post.updated_at,
        // If anonymous post, don't show user info
        user: isAnonymous
          ? { name: '匿名用戶', avatar: null, is_anonymous: true }
          : {
            id: profile?.id,
            name: profile?.username || '未知用戶',
            avatar: profile?.avatar_url || null,
            is_anonymous: false,
          },
        // Question-related info
        question_metadata: questionMetadata,
        is_question_post: !!questionMetadata,
        // For author identification (only if not anonymous)
        is_author: user && !isAnonymous ? post.user_id === user.id : false,
      };
    }) || [];

    // Get next cursor (last post's created_at)
    const nextCursor = formattedPosts.length === limit
      ? formattedPosts[formattedPosts.length - 1].created_at
      : null;

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      total: formattedPosts.length,
      nextCursor,
    });
  } catch (error) {
    console.error('[Community Posts] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    );
  }
}

