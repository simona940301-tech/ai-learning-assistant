'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { QuestionSetVM, E0Question } from '@/lib/mapper/vm/question-set'
import { toCanonicalKind, canonicalToLegacy } from '@/lib/explain/kind-alias'
import type { VocabularyVM, GrammarVM, ClozeVM, ReadingVM, TranslationVM } from '@/lib/mapper/explain-presenter'
import { VocabularyExplain } from '../VocabularyExplain'
import { GrammarExplain } from '../GrammarExplain'
import { ClozeExplain } from '../ClozeExplain'
import ReadingExplain from '../ReadingExplain'
import { TranslationExplain } from '../TranslationExplain'
import { nanoid } from 'nanoid'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Convert E0Question to VocabularyVM
 */
function toVocabularyVM(q: E0Question): VocabularyVM {
  const options = q.choices.map((text, idx) => {
    const label = String.fromCharCode(65 + idx) as 'A' | 'B' | 'C' | 'D'
    const isCorrect = q.answer_label === label || q.answer === text
    
    // Extract pos/zh from distractor_rejects if available
    const reject = q.distractor_rejects.find((r) => r.option === label)
    
    return {
      label,
      text,
      pos: reject?.reason?.split('｜')[1] || undefined,
      zh: reject?.reason?.split('｜')[2] || undefined,
      reason: reject?.reason || (isCorrect ? q.one_line_reason : ''),
      correct: isCorrect,
    }
  })
  
  return {
    id: `q${q.qid}`,
    kind: 'E1',
    stem: {
      en: q.stem,
    },
    options,
    answer: q.answer_label
      ? {
          label: q.answer_label,
          text: q.answer,
        }
      : undefined,
    meta: {
      reasonLine: q.one_line_reason,
    },
  }
}

/**
 * Convert E0Question to GrammarVM
 */
function toGrammarVM(q: E0Question): GrammarVM {
  const options = q.choices.map((text, idx) => {
    const label = String.fromCharCode(65 + idx) as 'A' | 'B' | 'C' | 'D'
    const isCorrect = q.answer_label === label || q.answer === text
    
    return {
      label,
      text,
      reason: q.distractor_rejects.find((r) => r.option === label)?.reason || (isCorrect ? q.one_line_reason : ''),
      correct: isCorrect,
    }
  })
  
  return {
    id: `q${q.qid}`,
    kind: 'E2',
    stem: {
      en: q.stem,
    },
    options,
    answer: q.answer_label
      ? {
          label: q.answer_label,
          text: q.answer,
        }
      : undefined,
    meta: {
      reasonLine: q.one_line_reason,
    },
  }
}

/**
 * Convert E0Question to ClozeVM
 */
function toClozeVM(q: E0Question): ClozeVM {
  return {
    id: `q${q.qid}`,
    kind: 'E3',
    stem: {
      en: q.stem,
    },
    article: {
      en: q.stem,
    },
    options: q.choices.map((text, idx) => {
      const label = String.fromCharCode(65 + idx) as 'A' | 'B' | 'C' | 'D'
      return {
        label,
        text,
        correct: q.answer_label === label || q.answer === text,
      }
    }),
    answer: q.answer_label
      ? {
          label: q.answer_label,
          text: q.answer,
        }
      : undefined,
    meta: {
      blankIndex: 1,
      totalBlanks: 1,
      reasonLine: q.one_line_reason,
    },
  }
}

/**
 * Convert E0Question to ReadingVM
 */
function toReadingVM(q: E0Question): ReadingVM {
  return {
    id: `q${q.qid}`,
    kind: 'E4',
    stem: {
      en: q.stem,
    },
    passage: {
      paragraphs: [q.stem],
    },
    questions: [
      {
        qid: String(q.qid),
        stem: q.stem,
        options: q.choices,
        answerLetter: q.answer_label,
        answerText: q.answer,
        reason: q.one_line_reason,
        evidence: [],
        meta: {
          paragraphIndex: 0,
          errorTypeTag: 'detail',
          keywords: [],
        },
      },
    ],
    meta: {
      totalQuestions: 1,
    },
  }
}

/**
 * Convert E0Question to TranslationVM
 */
function toTranslationVM(q: E0Question): TranslationVM {
  return {
    id: `q${q.qid}`,
    kind: 'E5',
    stem: {
      en: q.stem,
    },
    answer: q.answer_label
      ? {
          label: q.answer_label,
          text: q.answer,
        }
      : undefined,
    meta: {
      reasonLine: q.one_line_reason,
    },
  }
}

/**
 * Render single question by kind
 */
function renderOneQuestion(q: E0Question): React.ReactNode {
  const kind = toCanonicalKind(q.kind)
  
  if (!kind) {
    // Fallback to vocab
    return <VocabularyExplain view={toVocabularyVM(q)} />
  }
  
  switch (kind) {
    case 'vocab':
      return <VocabularyExplain view={toVocabularyVM(q)} />
    case 'grammar':
      return <GrammarExplain view={toGrammarVM(q)} />
    case 'cloze':
      return <ClozeExplain view={toClozeVM(q)} />
    case 'reading':
      return <ReadingExplain view={toReadingVM(q)} />
    case 'translation':
      return <TranslationExplain view={toTranslationVM(q)} />
    case 'discourse':
    case 'writing':
    default:
      // Fallback to vocab for unknown types
      return <VocabularyExplain view={toVocabularyVM(q)} />
  }
}

/**
 * QuestionSetExplain - E0 題組容器
 * 
 * 極簡設計：題組導航 + 逐題渲染專業組件
 */
export default function QuestionSetExplain({ vm }: { vm: QuestionSetVM }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const total = vm.questions.length
  const currentQuestion = useMemo(() => vm.questions[currentIdx], [vm.questions, currentIdx])
  
  const progress = ((currentIdx + 1) / total) * 100
  
  return (
    <div className="space-y-4 min-h-[40vh] max-h-[70vh] overflow-y-auto text-foreground bg-background">
      {/* Header: 題組資訊 + 進度條 */}
      <header className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="text-sm text-muted-foreground">
          題組模式 · 第 <span className="font-semibold text-foreground">{currentIdx + 1}</span> / {total} 題
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-foreground/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>
      
      {/* Current Question */}
      <section className="min-h-[30vh]">
        <motion.div
          key={currentQuestion.qid}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.3 }}
        >
          {renderOneQuestion(currentQuestion)}
        </motion.div>
      </section>
      
      {/* Footer: 導航按鈕 */}
      <footer className="flex items-center justify-between gap-3 pt-4 pb-[env(safe-area-inset-bottom)] border-t border-border/50">
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>上一題</span>
        </button>
        
        <div className="text-xs text-muted-foreground">
          {currentQuestion.kind} · {getKindLabel(currentQuestion.kind)}
        </div>
        
        <button
          onClick={() => setCurrentIdx((i) => Math.min(total - 1, i + 1))}
          disabled={currentIdx === total - 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-background"
        >
          <span>下一題</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  )
}

/**
 * Helper: Get kind label
 */
function getKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    vocab: '字彙題',
    grammar: '語法題',
    cloze: '克漏字',
    reading: '閱讀理解',
    discourse: '篇章結構',
    translation: '翻譯',
    writing: '寫作',
  }
  return labels[kind] || '題型'
}

