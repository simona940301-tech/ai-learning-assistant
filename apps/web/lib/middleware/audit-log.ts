/**
 * Audit Logging System
 * 
 * 記錄所有敏感操作和關鍵事件
 * 
 * 記錄的操作：
 * - 合約創建/承接/結算
 * - UGC 題目提交/審核
 * - 房間創建/加入
 * - 管理員操作
 */

import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'CONTRACT_CREATE'
  | 'CONTRACT_ACCEPT'
  | 'CONTRACT_SETTLE'
  | 'UGC_SUBMIT'
  | 'UGC_APPROVE'
  | 'UGC_REJECT'
  | 'ROOM_CREATE'
  | 'ROOM_JOIN'
  | 'ADMIN_ACTION'
  | 'ENERGY_CONSUME'
  | 'MATCH_QUEUE'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * 記錄審計日誌
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient()

    // 插入審計日誌（如果表存在）
    // 注意：需要先創建 audit_logs 表
    await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      metadata: entry.metadata || {},
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    // 審計日誌失敗不應該影響主流程
    console.error('[Audit Log] Failed to log event:', error)
  }
}

/**
 * 從請求中提取審計信息
 */
export function extractAuditInfo(req: Request): {
  ipAddress?: string
  userAgent?: string
} {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    undefined

  const userAgent = req.headers.get('user-agent') || undefined

  return { ipAddress, userAgent }
}

/**
 * 審計日誌裝飾器（用於 API 路由）
 */
export function withAuditLog(
  action: AuditAction,
  resourceType: string,
  getResourceId?: (req: Request) => string | undefined
) {
  return async (req: Request, userId: string, metadata?: Record<string, any>) => {
    const { ipAddress, userAgent } = extractAuditInfo(req)
    const resourceId = getResourceId ? getResourceId(req) : undefined

    await logAuditEvent({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      ipAddress,
      userAgent,
    })
  }
}

