'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Star, Flag } from 'lucide-react'

// 學霸補充類型定義
export type ScholarDisplayType = 'badge' | 'drawer' | 'hint' | 'comparison' | 'card'
export type ScholarContentType = 'flashcard' | 'formula' | 'pitfall' | 'comparison_table' | 'steps' | 'mnemonic' | 'quiz'

export interface ScholarSupplement {
  id: string
  displayType: ScholarDisplayType
  contentType: ScholarContentType
  content: string | { q: string; a: string }[] | { left: string; right: string }[]
  title?: string
}

// A. 標籤/徽章（最低干擾）
export function ScholarBadge({ content }: { content: string }) {
  return (
    <span className="ml-1 inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
      學霸補充
    </span>
  )
}

// B. 微抽屜（章節層級，預設收合）
export function ScholarDrawer({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="my-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
      >
        學霸補充
        <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded bg-blue-500/5 p-2 text-[13px]" style={{ lineHeight: 1.6 }}>
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// C. 行內提示塊（輕色底，≤2 行）
export function ScholarHint({ content, icon = 'star' }: { content: string; icon?: 'star' | 'flag' }) {
  const Icon = icon === 'star' ? Star : Flag

  return (
    <div className="my-2 flex items-start gap-2 rounded bg-blue-500/10 px-3 py-2" style={{ maxHeight: '48px' }}>
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />
      <div className="text-[13px] text-blue-700 dark:text-blue-300" style={{ lineHeight: 1.6 }}>
        {content}
      </div>
    </div>
  )
}

// D. 對照列（主條目下方縮排）
export function ScholarComparison({ main, supplement }: { main: string; supplement: string }) {
  return (
    <div className="my-2">
      <div className="text-[16px]" style={{ lineHeight: 1.75 }}>
        • {main}
      </div>
      <div className="ml-4 mt-1 text-[13px] text-blue-600 dark:text-blue-400" style={{ lineHeight: 1.6 }}>
        學霸補充：{supplement}
      </div>
    </div>
  )
}

// E. 分區卡（結果卡最下方）
export function ScholarCard({ items }: { items: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4"
    >
      <h3 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-blue-700 dark:text-blue-300">
        <Star className="h-4 w-4" />
        學霸補充
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="text-[16px]" style={{ lineHeight: 1.75 }}>
            • {item}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// 內容格式庫組件
export function ScholarContent({ type, content }: { type: ScholarContentType; content: any }) {
  switch (type) {
    case 'flashcard':
      return (
        <div className="space-y-2">
          {(content as { q: string; a: string }[]).map((card, i) => (
            <div key={i} className="rounded bg-blue-500/10 p-2">
              <div className="text-[13px] font-medium">Q: {card.q}</div>
              <div className="mt-1 text-[13px] text-[#8A8A8A]">A: {card.a}</div>
            </div>
          ))}
        </div>
      )

    case 'formula':
      return (
        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3">
          <div className="font-mono text-[14px]">{content}</div>
        </div>
      )

    case 'pitfall':
      return (
        <div className="space-y-1">
          {(content as string[]).map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px] text-red-600 dark:text-red-400">
              <span>⚠️</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )

    case 'comparison_table':
      return (
        <div className="grid grid-cols-2 gap-2">
          {(content as { left: string; right: string }[]).map((row, i) => (
            <>
              <div key={`${i}-l`} className="rounded bg-blue-500/10 p-2 text-[13px]">
                {row.left}
              </div>
              <div key={`${i}-r`} className="rounded bg-blue-500/10 p-2 text-[13px]">
                {row.right}
              </div>
            </>
          ))}
        </div>
      )

    case 'steps':
      return (
        <div className="space-y-1">
          {(content as string[]).map((step, i) => (
            <div key={i} className="text-[13px]">
              {i + 1}. {step}
            </div>
          ))}
        </div>
      )

    case 'mnemonic':
      return (
        <div className="rounded bg-yellow-500/10 p-2 text-[13px] font-medium text-yellow-700 dark:text-yellow-300">
          💡 {content}
        </div>
      )

    case 'quiz':
      const [showAnswer, setShowAnswer] = useState(false)
      return (
        <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3">
          <div className="text-[13px] font-medium">{(content as any).question}</div>
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="mt-2 text-[11px] text-blue-600 hover:text-blue-700"
          >
            {showAnswer ? '隱藏' : '顯示'}答案
          </button>
          <AnimatePresence>
            {showAnswer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 text-[13px] text-[#8A8A8A]"
              >
                {(content as any).answer}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )

    default:
      return <div className="text-[13px]">{content}</div>
  }
}

// 智能選擇展示方式
export function renderScholarSupplement(supplement: ScholarSupplement) {
  const { displayType, contentType, content, title } = supplement

  switch (displayType) {
    case 'badge':
      return <ScholarBadge content={content as string} />
    case 'drawer':
      return <ScholarDrawer title={title || '學霸補充'} content={content as string} />
    case 'hint':
      return <ScholarHint content={content as string} />
    case 'comparison':
      const [main, supp] = (content as string).split('||')
      return <ScholarComparison main={main} supplement={supp} />
    case 'card':
      return <ScholarCard items={content as string[]} />
    default:
      return <ScholarContent type={contentType} content={content} />
  }
}
