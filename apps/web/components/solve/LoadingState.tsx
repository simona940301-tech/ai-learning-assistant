'use client'

import React from 'react'

/**
 * 極簡載入狀態組件（零 JS 重渲染）
 * 
 * 設計原則：
 * - 使用純 CSS 動畫（animate-bounce），零 JavaScript 開銷
 * - 移除打字機動畫，立即顯示完整文字
 * - 保持極簡設計，符合深色主題
 */
export function LoadingState({ currentStep = 0 }: { currentStep?: number }) {
  const steps = ['正在分析題目…', '正在生成詳解…']
  const message = steps[currentStep] ?? steps[0]

  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 border border-zinc-800/50 p-6">
      <div className="flex items-center gap-3">
        {/* CSS-only dots, zero JS re-renders */}
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
        </div>
        <span className="text-sm font-medium text-zinc-200">{message}</span>
      </div>
    </div>
  )
}




