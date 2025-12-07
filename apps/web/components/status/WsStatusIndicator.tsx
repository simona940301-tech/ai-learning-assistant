'use client'

import { usePlay } from '@/lib/play-context'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useState } from 'react'

/**
 * WsStatusIndicator - WebSocket 連線狀態指示器
 * 
 * 顯示 WS 連線狀態，點擊可展開顯示詳細資訊（端點、環境變數狀態）
 * 僅在開發環境或 DEV_MODE 時顯示詳細資訊
 */
export function WsStatusIndicator({ 
  showDetails = false,
  compact = true,
}: { 
  showDetails?: boolean
  compact?: boolean
}) {
  const { wsConnected } = usePlay()
  const [isExpanded, setIsExpanded] = useState(false)

  // 從環境變數獲取配置
  const wsUrl = process.env.NEXT_PUBLIC_BATTLE_WS_URL || 'ws://localhost:8080/ws/battle'
  const wsEnabled = process.env.NEXT_PUBLIC_BATTLE_WS_ENABLED !== 'false'
  const isDev = process.env.NODE_ENV === 'development'

  // 狀態顏色
  const statusColor = wsConnected 
    ? '#22c55e' // green-500
    : wsEnabled 
      ? '#f59e0b' // amber-500 (嘗試連線中)
      : '#ef4444' // red-500 (已停用)

  const statusText = wsConnected 
    ? '已連線' 
    : wsEnabled 
      ? '連線中...' 
      : '已停用'

  const StatusIcon = wsConnected 
    ? Wifi 
    : wsEnabled 
      ? Loader2 
      : WifiOff

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
        className="relative inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-white/10"
        style={{
          background: 'rgba(247,238,227,0.15)',
          boxShadow: 'inset 0 0 0 0.6px rgba(107,74,54,0.16)',
        }}
        title={`WebSocket: ${statusText}`}
      >
        <div 
          className="relative flex h-2 w-2 items-center justify-center"
        >
          <span 
            className="absolute h-full w-full animate-ping rounded-full opacity-75"
            style={{ 
              backgroundColor: statusColor,
              animationDuration: wsConnected ? '3s' : '1.5s',
            }}
          />
          <span 
            className="relative h-2 w-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>
        
        {!compact && (
          <span 
            className="text-xs font-medium"
            style={{ color: statusColor }}
          >
            {statusText}
          </span>
        )}

        {/* 展開的詳細資訊 */}
        {showDetails && isExpanded && (
          <div 
            className="absolute left-0 top-full z-50 mt-2 min-w-[280px] rounded-lg border border-border bg-card p-3 text-left shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-2 text-sm font-semibold text-card-foreground">
              WebSocket 狀態
            </h4>
            
            <div className="space-y-2 text-xs">
              {/* 連線狀態 */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">狀態</span>
                <span 
                  className="flex items-center gap-1 font-medium"
                  style={{ color: statusColor }}
                >
                  <StatusIcon className={`h-3 w-3 ${!wsConnected && wsEnabled ? 'animate-spin' : ''}`} />
                  {statusText}
                </span>
              </div>

              {/* 啟用狀態 */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">WS 啟用</span>
                <span className={wsEnabled ? 'text-green-500' : 'text-red-500'}>
                  {wsEnabled ? '是' : '否'}
                </span>
              </div>

              {/* 端點 */}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">端點</span>
                <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                  {wsUrl}
                </code>
              </div>

              {/* 環境 */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">環境</span>
                <span className="text-foreground">
                  {isDev ? 'Development' : 'Production'}
                </span>
              </div>
            </div>

            {/* 疑難排解提示 */}
            {!wsConnected && wsEnabled && (
              <div className="mt-3 rounded bg-amber-500/10 p-2 text-[10px] text-amber-600">
                <p className="font-medium">連線失敗？請確認：</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-600/80">
                  <li>Fly.io battle-ws 服務正在運行</li>
                  <li>環境變數設定正確</li>
                  <li>INTERNAL_API_KEY 兩端一致</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </button>
    )
  }

  // 完整版本（用於 dev-tools 頁面）
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div 
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <StatusIcon 
            className={`h-5 w-5 ${!wsConnected && wsEnabled ? 'animate-spin' : ''}`}
            style={{ color: statusColor }}
          />
        </div>
        
        <div>
          <h4 className="font-medium text-card-foreground">WebSocket 狀態</h4>
          <p className="text-sm" style={{ color: statusColor }}>{statusText}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">端點</span>
          <code className="max-w-[200px] truncate rounded bg-muted px-1.5 py-0.5 text-xs">
            {wsUrl}
          </code>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">WS 啟用</span>
          <span className={wsEnabled ? 'text-green-500' : 'text-red-500'}>
            {wsEnabled ? '是' : '否'}
          </span>
        </div>
      </div>
    </div>
  )
}
