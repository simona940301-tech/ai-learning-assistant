'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Highlighter } from 'lucide-react'
import { track } from '@/lib/telemetry'

interface SelectionTooltipProps {
  clientRect: DOMRect
  onAsk: () => void
  onHighlight: (color?: string) => void
  isDockOpen?: boolean
  isDrawingMode?: boolean
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', value: '#FFEB3B' },
  { name: 'green', value: '#4CAF50' },
  { name: 'blue', value: '#2196F3' },
  { name: 'orange', value: '#FF9800' },
  { name: 'pink', value: '#E91E63' },
] as const

/**
 * 極簡主義 Selection Tooltip
 * 
 * 設計原則：
 * - 0.8 秒延遲顯示，避免快速選取時頻繁彈出
 * - 毛玻璃背景，圓形按鈕
 * - 展開式顏色選擇器（初始只顯示兩個按鈕）
 * - 流暢的動畫效果
 */
export function SelectionTooltip({
  clientRect,
  onAsk,
  onHighlight,
  isDockOpen = false,
  isDrawingMode = false,
}: SelectionTooltipProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // 計算工具列位置（水平居中，垂直上方 -10px）
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
  
  const tooltipHeight = 48
  const tooltipWidth = 200
  const padding = 16
  
  let x = clientRect.left + clientRect.width / 2
  let y = clientRect.top - 10 // 選取範圍上方 -10px
  
  // 邊界檢查
  if (x < tooltipWidth / 2 + padding) {
    x = tooltipWidth / 2 + padding
  }
  if (x > viewportWidth - tooltipWidth / 2 - padding) {
    x = viewportWidth - tooltipWidth / 2 - padding
  }
  if (y < padding) {
    y = clientRect.bottom + 8
  }
  if (y + tooltipHeight > viewportHeight - padding) {
    y = Math.max(padding, clientRect.top - tooltipHeight - 8)
  }

  // 點擊外部關閉顏色選擇器
  useEffect(() => {
    if (!showColorPicker) return

    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  const handleAsk = (e: React.MouseEvent) => {
    e.stopPropagation()
    track('backpack.reader.selection.ask')
    window.getSelection()?.removeAllRanges()
    onAsk()
  }

  const handleHighlightClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowColorPicker((prev) => !prev)
  }

  const handleColorSelect = (e: React.MouseEvent, color: string) => {
    e.stopPropagation()
    track('backpack.reader.selection.highlight', { color })
    window.getSelection()?.removeAllRanges()
    setShowColorPicker(false)
    onHighlight(color)
  }

  // 不顯示條件：Dock 開啟或繪圖模式
  if (isDockOpen || isDrawingMode) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
          duration: 0.2,
        }}
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translateX(-50%) translateY(-100%)',
        }}
      >
        {/* 主工具列：白色毛玻璃背景，圓形按鈕 */}
        <div className="flex items-center gap-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-3xl shadow-lg border border-gray-100 dark:border-zinc-700 px-2 py-1.5 pointer-events-auto">
          {/* 提問按鈕 */}
          <button
            onClick={handleAsk}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="提問"
            title="提問"
          >
            <MessageSquare className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>

          {/* 分隔線 */}
          <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1" />

          {/* 螢光筆按鈕 */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={handleHighlightClick}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="螢光筆"
              title="螢光筆"
            >
              <Highlighter className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </button>

            {/* 顏色選擇器（展開式） */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 p-2 pointer-events-auto"
                >
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={(e) => handleColorSelect(e, color.value)}
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 shadow-md hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      aria-label={color.name}
                      title={color.name}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
