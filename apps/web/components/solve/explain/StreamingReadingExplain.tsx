'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useStreamingExplanation } from './useStreamingExplanation'
import { TypewriterText } from './TypewriterText'
import ReadingExplain from './ReadingExplain'
import type { ReadingVM } from '@/lib/mapper/explain-presenter'
import { presentExplainCard } from '@/lib/mapper/explain-presenter'
import type { ExplainCard } from '@/lib/contracts/explain'

interface StreamingReadingExplainProps {
  questionText: string
  onComplete?: (card: ExplainCard) => void
}

/**
 * Streaming Reading Explanation with typewriter effect
 * Shows explanation as it's being generated
 */
export default function StreamingReadingExplain({
  questionText,
  onComplete,
}: StreamingReadingExplainProps) {
  const { card, streamingText, isStreaming, currentStage, error, startStreaming, stopStreaming } =
    useStreamingExplanation(questionText)

  useEffect(() => {
    if (questionText.trim()) {
      startStreaming()
    }
    return () => {
      stopStreaming()
    }
  }, [questionText, startStreaming, stopStreaming])

  // Convert card to VM when complete
  const [viewModel, setViewModel] = useState<ReadingVM | null>(null)

  useEffect(() => {
    if (card && card.kind === 'E4') {
      try {
        const vm = presentExplainCard(card) as ReadingVM
        if (vm.kind === 'E4') {
          setViewModel(vm)
          onComplete?.(card)
        }
      } catch (err) {
        console.error('[StreamingReadingExplain] Failed to present card:', err)
      }
    }
  }, [card, onComplete])

  // Show final explanation when complete
  if (viewModel && !isStreaming) {
    return <ReadingExplain view={viewModel} />
  }

  // Show streaming UI
  return (
    <div className="space-y-3 leading-relaxed pb-8">
      {/* Streaming status */}
      {isStreaming && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {currentStage && (
                <div className="text-sm text-muted-foreground">{currentStage}</div>
              )}

              {/* Streaming text with typewriter effect */}
              {streamingText && (
                <div className="text-sm leading-relaxed">
                  <TypewriterText text={streamingText} speed={5} className="text-foreground" />
                </div>
              )}

              {/* Loading indicator */}
              {!streamingText && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>正在生成詳解...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
