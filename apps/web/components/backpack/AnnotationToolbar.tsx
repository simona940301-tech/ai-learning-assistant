'use client'

import { useState, useRef, useEffect } from 'react'
import { Pen, Highlighter, StickyNote, Undo2, Redo2, Eraser } from 'lucide-react'
import { motion } from 'framer-motion'
import { track } from '@/lib/telemetry'

interface AnnotationToolbarProps {
  tool: 'pen' | 'marker' | 'sticky' | 'eraser' | null
  color: string
  strokeWidth: number
  onToolChange: (tool: 'pen' | 'marker' | 'sticky' | 'eraser' | null) => void
  onColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

// GoodNotes-style colors (more muted, professional)
const COLORS = [
  { value: '#000000', label: '黑色' },
  { value: '#FF3B30', label: '紅色' },
  { value: '#007AFF', label: '藍色' },
  { value: '#34C759', label: '綠色' },
  { value: '#FF9500', label: '橙色' },
  { value: '#AF52DE', label: '紫色' },
  { value: '#FF2D92', label: '粉色' },
  { value: '#FFF59D', label: '黃色' },
]

const STROKE_WIDTHS = [
  { value: 2, label: '細', displayWidth: 1 },
  { value: 4, label: '中', displayWidth: 2 },
  { value: 8, label: '粗', displayWidth: 4 },
]

export function AnnotationToolbar({
  tool,
  color,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: AnnotationToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)

  const tools = [
    { id: 'pen' as const, icon: Pen, label: '筆刷' },
    { id: 'marker' as const, icon: Highlighter, label: '螢光筆' },
    { id: 'eraser' as const, icon: Eraser, label: '橡皮擦' },
    { id: 'sticky' as const, icon: StickyNote, label: '文字框' },
  ]

  const handleToolClick = (toolId: 'pen' | 'marker' | 'sticky' | 'eraser') => {
    // 如果點擊已選中的工具，切換回選取模式（null）
    const newTool = tool === toolId ? null : toolId
    onToolChange(newTool)
    track('backpack.reader.tool.change', { tool: newTool })
  }

  return (
    <motion.div
      ref={toolbarRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
    >
      {/* GoodNotes 風格：更緊湊的工具欄，平板優化 */}
      <div className="bg-white/98 dark:bg-zinc-900/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-zinc-200/60 dark:border-zinc-700/60 px-4 py-2.5 flex items-center gap-4 justify-center">
        {/* Tools - 更大的觸控目標，適合平板 */}
        <div className="flex items-center gap-2">
          {tools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleToolClick(id)}
              className={`
                relative w-11 h-11 rounded-xl transition-all duration-200 flex items-center justify-center
                ${tool === id
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95'
                }
              `}
              aria-label={label}
              title={label}
            >
              <Icon className="h-5 w-5" />
              {tool === id && (
                <motion.div
                  layoutId="activeTool"
                  className="absolute inset-0 rounded-xl bg-blue-500 -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Separator */}
        {(tool === 'pen' || tool === 'marker') && (
          <>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />

            {/* Stroke Width - GoodNotes 風格：水平線條預覽 */}
            <div className="flex items-center gap-2">
              {STROKE_WIDTHS.map(({ value, label: widthLabel, displayWidth }) => {
                const isActive = strokeWidth === value || Math.abs(strokeWidth - value) <= 1
                return (
                  <button
                    key={value}
                    onClick={() => onStrokeWidthChange(value)}
                    className={`
                      w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center
                      ${isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-105'
                        : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95'
                      }
                    `}
                    aria-label={widthLabel}
                    title={widthLabel}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: `${Math.max(displayWidth * 5, 8)}px`,
                        height: `${Math.max(displayWidth, 2)}px`,
                        backgroundColor: tool === 'marker' ? '#FFD700' : color,
                      }}
                    />
                  </button>
                )
              })}
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />

            {/* Color Palette - GoodNotes 風格：更大的色塊，觸控友好 */}
            <div className="flex items-center gap-2">
              {COLORS.map(({ value, label: colorLabel }) => (
                <button
                  key={value}
                  onClick={() => onColorChange(value)}
                  className={`
                    w-9 h-9 rounded-full border-2 transition-all active:scale-90
                    ${color === value
                      ? 'border-blue-500 scale-110 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-zinc-300 dark:border-zinc-700 hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: value }}
                  aria-label={colorLabel}
                  title={colorLabel}
                />
              ))}
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
          </>
        )}

        {/* Undo/Redo - GoodNotes 風格：更明顯的按鈕 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`
              w-10 h-10 rounded-xl transition-all flex items-center justify-center
              ${canUndo
                ? 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95'
                : 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
              }
            `}
            aria-label="上一步"
            title="上一步"
          >
            <Undo2 className="h-5 w-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`
              w-10 h-10 rounded-xl transition-all flex items-center justify-center
              ${canRedo
                ? 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95'
                : 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
              }
            `}
            aria-label="下一步"
            title="下一步"
          >
            <Redo2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
