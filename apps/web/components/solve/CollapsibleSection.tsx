'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CollapsibleSectionProps {
  title: string
  content: string
  maxLength?: number
  defaultExpanded?: boolean
  className?: string
}

/**
 * 可展開/收合的長內容區塊
 * 超過 maxLength 字數時自動收合，避免「被切斷感」
 */
export function CollapsibleSection({
  title,
  content,
  maxLength = 400,
  defaultExpanded = false,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const shouldCollapse = content.length > maxLength
  const displayContent = shouldCollapse && !isExpanded ? content.slice(0, maxLength) + '…' : content

  return (
    <div className={`rounded-lg border border-zinc-800/50 bg-zinc-900/40 ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {isExpanded ? (
              <>
                <span>收合</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>展開</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? 'expanded' : 'collapsed'}
          initial={{ height: 'auto' }}
          animate={{ height: 'auto' }}
          exit={{ height: 'auto' }}
          className="px-4 pb-3"
        >
          <p className="text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap">{displayContent}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}



