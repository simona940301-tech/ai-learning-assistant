/**
 * Enhanced Role Management System
 * 
 * 增強的權限管理系統
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export type UserRole = 'admin' | 'teacher' | 'student' | 'guest'

export interface UserPermissions {
  canCreateContract: boolean
  canReviewUGC: boolean
  canManageRooms: boolean
  canViewMetrics: boolean
}

/**
 * 獲取用戶角色
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createClient()

  // 方法 1: 從環境變數檢查（臨時方案）
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('id', userId)
    .single()

  // 優先使用數據庫中的角色
  if (profile?.role && ['admin', 'teacher', 'student', 'guest'].includes(profile.role)) {
    return profile.role as UserRole
  }

  // 方法 2: 從環境變數檢查（後備方案）
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  if (profile?.email && adminEmails.includes(profile.email)) {
    return 'admin'
  }

  return profile?.role as UserRole || 'student'
}

/**
 * 獲取用戶權限
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const role = await getUserRole(userId)

  return {
    canCreateContract: role !== 'guest',
    canReviewUGC: role === 'admin',
    canManageRooms: role !== 'guest',
    canViewMetrics: role === 'admin',
  }
}

/**
 * 檢查用戶是否有特定權限
 */
export async function hasPermission(
  userId: string,
  permission: keyof UserPermissions
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions[permission]
}

/**
 * 權限檢查中間件
 */
export function withPermission(
  permission: keyof UserPermissions,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '未授權' },
        { status: 401 }
      )
    }

    const hasPerm = await hasPermission(user.id, permission)
    if (!hasPerm) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '權限不足' },
        { status: 403 }
      )
    }

    return handler(req, user.id)
  }
}

