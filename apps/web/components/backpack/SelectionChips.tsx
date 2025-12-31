'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Highlighter, Sparkles } from 'lucide-react'
import { track } from '@/lib/telemetry'

interface SelectionChipsProps {
  clientRect: DOMRect
  onAsk: () => void
  onExplain: () => void
  onHighlight: () => void
}

export function SelectionChips({ clientRect, onAsk, onExplain, onHighlight }: SelectionChipsProps) {
  // GoodNotes 風格：浮動工具欄顯示在選取文字上方，居中對齊
  // 確保工具欄不會超出視窗邊界
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
  
  const tooltipHeight = 48 // 工具欄高度
  const tooltipWidth = 240 // 工具欄寬度（估算）
  const padding = 16 // 邊距
  
  let x = clientRect.left + clientRect.width / 2
  let y = clientRect.top - tooltipHeight - 8 // 8px 間距
  
  // 確保不超出左邊界
  if (x < tooltipWidth / 2 + padding) {
    x = tooltipWidth / 2 + padding
  }
  // 確保不超出右邊界
  if (x > viewportWidth - tooltipWidth / 2 - padding) {
    x = viewportWidth - tooltipWidth / 2 - padding
  }
  // 如果上方空間不足，顯示在下方
  if (y < padding) {
    y = clientRect.bottom + 8
  }
  // 確保不超出下邊界
  if (y + tooltipHeight > viewportHeight - padding) {
    y = Math.max(padding, clientRect.top - tooltipHeight - 8)
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 5 }}
        transition={{ 
          type: 'spring',
          stiffness: 500,
          damping: 30,
          duration: 0.2
        }}
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translateX(-50%)',
        }}
      >
        {/* GoodNotes 風格：圓形按鈕，緊湊排列，毛玻璃效果 */}
        <div className="flex items-center gap-2 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-xl rounded-full shadow-2xl border border-zinc-200/60 dark:border-zinc-700/60 px-2 py-1.5 pointer-events-auto">
          <button
            onClick={() => {
              track('backpack.reader.selection.ask')
              onAsk()
            }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white shadow-md"
            aria-label="提問"
            title="提問"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => {
              track('backpack.reader.selection.explain')
              onExplain()
            }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-500 hover:bg-purple-600 active:scale-95 transition-all text-white shadow-md"
            aria-label="解釋"
            title="解釋"
          >
            <Sparkles className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => {
              track('backpack.reader.selection.highlight')
              onHighlight()
            }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-yellow-400 hover:bg-yellow-500 active:scale-95 transition-all text-yellow-900 shadow-md"
            aria-label="螢光筆"
            title="螢光筆"
          >
            <Highlighter className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

