import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/community/posts/create
 * 
 * 創建 community 貼文（支援「求助學霸」功能）
 * 
 * Body:
 * - content: string - 貼文內容（用戶的問題）
 * - is_anonymous: boolean - 是否匿名發問
 * - question_metadata?: object - 題目相關資訊（可選）
 *   - questionText: string
 *   - options: string[]
 *   - correctAnswer: string
 *   - userAnswer?: string
 *   - explanation?: string
 *   - questionId?: string
 * - add_to_error_book?: boolean - 已停用，錯題本僅由對戰/練習流程寫入
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 驗證用戶身份
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

    // 解析請求體
    const body = await req.json();
    const {
      content,
      is_anonymous = false,
      question_metadata,
      // 錯題本僅允許對戰/練習流程寫入，社群貼文不再觸發
      add_to_error_book = false,
    } = body;

    // 驗證必填欄位
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '請輸入問題內容' },
        { status: 400 }
      );
    }

    // 構建 question_metadata
    const metadata = question_metadata ? {
      questionText: question_metadata.questionText,
      options: question_metadata.options || [],
      correctAnswer: question_metadata.correctAnswer,
      userAnswer: question_metadata.userAnswer || null,
      explanation: question_metadata.explanation || null,
      questionId: question_metadata.questionId || null,
      type: 'question_help', // 標記為求助學霸類型的貼文
    } : {};

    // 插入貼文到資料庫
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        is_anonymous: Boolean(is_anonymous),
        question_metadata: Object.keys(metadata).length > 0 ? metadata : null,
        images: [],
        likes: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Community Post Create] Database error:', insertError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '發布失敗，請稍後再試' },
        { status: 500 }
      );
    }

    // 返回成功響應
    return NextResponse.json(
      {
        success: true,
        message: '問題已發布到社群',
        post: {
          id: post.id,
          content: post.content,
          is_anonymous: post.is_anonymous,
          created_at: post.created_at,
        },
        // 返回 community 頁面的 URL（前端可以用來跳轉）
        community_url: `/community?post=${post.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Community Post Create] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    );
  }
}
