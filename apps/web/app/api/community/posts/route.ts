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

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 獲取貼文，同時獲取用戶資訊（但如果是匿名貼文，不顯示用戶資訊）
    // 如果 posts 表不存在或查詢失敗，返回空陣列而不是錯誤
    const { data: posts, error: postsError } = await supabase
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
      .range(offset, offset + limit - 1);

    console.log('[Community Posts] Query result:', { postsCount: posts?.length, postsError });

    // 如果表不存在或其他錯誤，返回空陣列（優雅降級）
    if (postsError) {
      console.error('[Community Posts] Database error:', postsError);
      
      // 如果是表不存在的錯誤，返回空陣列
      if (postsError.code === '42P01' || postsError.message?.includes('does not exist')) {
        console.warn('[Community Posts] Posts table does not exist, returning empty array');
        return NextResponse.json({
          success: true,
          posts: [],
          total: 0,
        });
      }
      
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: `獲取貼文失敗: ${postsError.message}` },
        { status: 500 }
      );
    }

    // 格式化貼文資料
    const formattedPosts = posts?.map((post: any) => {
      const profile = post.profiles;
      const isAnonymous = post.is_anonymous || false;
      const questionMetadata = post.question_metadata || null;

      return {
        id: post.id,
        content: post.content,
        images: post.images || [],
        likes: post.likes || 0,
        created_at: post.created_at,
        updated_at: post.updated_at,
        // 如果是匿名貼文，不顯示用戶資訊
        user: isAnonymous
          ? { name: '匿名用戶', avatar: null, is_anonymous: true }
          : {
            id: profile?.id,
            name: profile?.username || '未知用戶',
            avatar: profile?.avatar_url || null,
            is_anonymous: false,
          },
        // 題目相關資訊
        question_metadata: questionMetadata,
        is_question_post: !!questionMetadata,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      total: formattedPosts.length,
    });
  } catch (error) {
    console.error('[Community Posts] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    );
  }
}

