'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { ThinkingShimmer } from '@/components/ui/thinking-shimmer'
import { ShimmerWave } from '@/components/ui/thinking-shimmer'

interface StreamingExplainPlaceholderProps {
  streamingText?: string // Deprecated: Do not display raw text
  currentStage?: string
  isLoading?: boolean
}

/**
 * Phase 1 Thinking Messages
 * Rotate automatically every 1.5-2 seconds (ChatGPT-style)
 */
const THINKING_MESSAGES = [
  '正在分析題目…',
  '正在檢查關鍵字…',
  '正在定位證據句…',
  '正在生成詳解…',
]

/**
 * Streaming explanation placeholder with rotating thinking animation
 * 
 * Design Principle:
 * - Phase 1 (Thinking): Rotating messages with shimmer (1.5-2s intervals)
 * - Phase 2 (Typing): Only when final explanation arrives (handled by parent)
 * - Smooth fade transitions between messages
 * - No raw JSON/text visible during computation
 */
export default function StreamingExplainPlaceholder({
  streamingText = '', // Ignored - do not display raw text
  currentStage = '',
  isLoading = true,
}: StreamingExplainPlaceholderProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  // Rotate messages automatically (ChatGPT-style)
  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 1700) // Rotate every 1.7 seconds (1.5-2s range, ChatGPT-style)

    return () => clearInterval(interval)
  }, [isLoading])

  // Use stage-specific message if provided, otherwise use rotating messages
  const getMessage = () => {
    if (currentStage) {
      if (currentStage.includes('生成')) return '正在生成詳解...'
      if (currentStage.includes('分析')) return '正在分析題目...'
      if (currentStage.includes('檢查')) return '正在檢查關鍵字...'
      if (currentStage.includes('定位')) return '正在定位證據句...'
      return currentStage
    }
    return THINKING_MESSAGES[messageIndex]
  }

  return (
    <motion.div
      key="explain-placeholder"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden"
    >
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4 min-h-[8rem] flex items-center justify-center">
            {/* Thinking animation - wave shimmer effect */}
            <div className="relative w-full">
              {/* Background shimmer */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <ShimmerWave />
              </div>

              {/* Content with fade transition */}
              <div className="relative py-8">
                <motion.div
                  key={messageIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4 }}
                >
                  <ThinkingShimmer message={getMessage()} />
                </motion.div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}