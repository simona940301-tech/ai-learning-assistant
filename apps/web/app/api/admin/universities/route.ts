import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { universities } from '@/lib/taiwan-universities'

/**
 * GET /api/admin/universities
 * 獲取所有大學和科系資料
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
    }

    // 檢查管理員權限
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '權限不足，僅管理員可訪問此功能' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      universities: universities.filter(u => u.id !== 'other'),
    })
  } catch (error) {
    console.error('[Admin Universities] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/universities
 * 更新大學和科系資料（直接更新 taiwan-universities.ts 檔案）
 * 
 * 注意：這個API需要直接修改源碼檔案，在生產環境中應該使用資料庫
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
    }

    // 檢查管理員權限
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '權限不足，僅管理員可訪問此功能' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, data } = body

    if (!action) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '請提供操作類型' },
        { status: 400 }
      )
    }

    // 注意：在生產環境中，應該將資料儲存在資料庫中
    // 這裡只是返回成功訊息，實際的資料更新需要手動修改 taiwan-universities.ts 檔案
    // 或者實現一個資料庫儲存方案

    return NextResponse.json({
      success: true,
      message: '資料已接收，請手動更新 taiwan-universities.ts 檔案或實現資料庫儲存',
      action,
      data,
    })
  } catch (error) {
    console.error('[Admin Universities] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}






