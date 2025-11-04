'use client'

import { track } from '@plms/shared/analytics'
import type { ReadingQuestionVM } from '@/lib/mapper/explain-presenter'

interface VerticalReasoningFlowProps {
  question: ReadingQuestionVM
  onStepClick?: (paragraphIndex: number, sentenceIndex?: number) => void
}

interface ReasoningStep {
  type: 'keywords' | 'evidence' | 'cue' | 'relation' | 'answer'
  label: string
  content?: string
  paragraphIndex?: number
  sentenceIndex?: number
}

/**
 * S2: Vertical Reasoning Flow
 * Auto-collapsing stepper, taps scroll to passage
 */
export function VerticalReasoningFlow({ question, onStepClick }: VerticalReasoningFlowProps) {
  const steps: ReasoningStep[] = []
  
  // 1. Keywords (optional)
  if (question.meta.keywords && question.meta.keywords.length > 0) {
    steps.push({
      type: 'keywords',
      label: '關鍵詞',
      content: question.meta.keywords.slice(0, 3).join('、'),
    })
  }
  
  // 2. Evidence (required if exists)
  const primaryEvidence = question.evidence[0]
  if (primaryEvidence) {
    steps.push({
      type: 'evidence',
      label: '證據',
      content: primaryEvidence.text.substring(0, 80) + (primaryEvidence.text.length > 80 ? '...' : ''),
      paragraphIndex: primaryEvidence.paragraphIndex,
      sentenceIndex: primaryEvidence.sentenceIndex,
    })
  }
  
  // 3. Cue words (detect from evidence)
  const cueWords = ['however', 'but', 'because', 'therefore', 'thus', 'although']
  const evidenceText = primaryEvidence?.text.toLowerCase() || ''
  const foundCue = cueWords.find(cue => evidenceText.includes(cue))
  if (foundCue) {
    steps.push({
      type: 'cue',
      label: '提示詞',
      content: foundCue,
    })
  }
  
  // 4. Reasoning relation (from error tag)
  if (question.meta.errorTypeTag) {
    const relationMap: Record<string, string> = {
      '細節錯': '細節理解',
      '推論錯': '因果推論',
      '語意誤導': '對比轉折',
      '詞義錯': '語意判斷',
    }
    steps.push({
      type: 'relation',
      label: '推理類型',
      content: relationMap[question.meta.errorTypeTag] || question.meta.errorTypeTag,
    })
  }
  
  // 5. Answer (required)
  if (question.answerLetter) {
    steps.push({
      type: 'answer',
      label: '答案',
      content: question.answerLetter + (question.answerText ? ` — ${question.answerText.substring(0, 50)}` : ''),
    })
  }
  
  if (steps.length === 0) return null
  
  const handleStepClick = (step: ReasoningStep) => {
    if (step.paragraphIndex !== undefined && onStepClick) {
      onStepClick(step.paragraphIndex, step.sentenceIndex)
      track('reason.flow.step.click', {
        stepType: step.type,
        qid: question.qid,
      })
    }
  }
  
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const isClickable = step.paragraphIndex !== undefined
        const Component = isClickable ? 'button' : 'div'
        
        return (
          <Component
            key={idx}
            type={isClickable ? 'button' : undefined}
            onClick={isClickable ? () => handleStepClick(step) : undefined}
            className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              isClickable
                ? 'hover:bg-muted/50 active:bg-muted cursor-pointer'
                : 'text-muted-foreground'
            }`}
          >
            {/* Minimal step indicator */}
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              {idx + 1}
            </span>
            
            <div className="flex-1 space-y-0.5">
              <div className="text-xs font-medium text-muted-foreground">{step.label}</div>
              {step.content && (
                <div className="text-sm leading-relaxed text-foreground">{step.content}</div>
              )}
            </div>
            
            {isClickable && (
              <span className="shrink-0 text-xs text-primary">查看</span>
            )}
          </Component>
        )
      })}
    </div>
  )
}

