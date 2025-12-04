// @ts-nocheck
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import type { ExplainViewModel } from '@/lib/types'
import type { ConservativeResult } from '@/lib/ai/conservative-types'
import { track } from '@plms/shared/analytics'
import { toCanonicalKind, toLegacyCanonicalKind, canonicalToLegacy, getKindLabel } from '@/lib/explain/kind-alias'
import { toQuestionSetVM } from '@/lib/mapper/explain-presenter'
import { detectMultipleQuestions } from '@/lib/explain/multi-question-detector'
import { supabaseBrowserClient } from '@/lib/supabase'
import type { UniversalExplainResult } from '@/lib/ai/universal-explainer'
import { sendExplanationViewedAction } from '@/lib/chick/action-bus'
import { useChickStore } from '@/src/store/chickStore'
import {
  analyseQuestionSet,
  type QuestionSetAnalysis,
  type QuestionSetKind,
} from '@/lib/explain/question-set-detector'
import { Button } from '@/components/ui/button'
import { Save, Check, AlertCircle } from 'lucide-react'
import { MarkdownExplain } from './MarkdownExplain'

export interface ExplainCardSnapshot {
  questionText: string
  answer?: string
  reason?: string
  summary?: string
  markdown?: string
  focus?: string
  questionSet?: Array<{ title: string; answer?: string; reason?: string }>
}

interface ExplainCardV2Props {
  inputText: string
  questionId?: string // Optional: 保留以備未來使用
  conservative?: boolean // Enable conservative mode
  onLoadingChange?: (isLoading: boolean) => void
  onExplainComplete?: (snapshot: ExplainCardSnapshot) => void
}

/**
 * Loading state with rotating AI progress messages (暖黃色調)
 */
function LoadingState({ currentStep }: { currentStep: number }) {
  const loadingSteps = [
    '正在解析題目…',
    '正在判讀題型…',
    '正在分析語意結構…',
    '正在抽取關鍵訊息…',
    '正在生成詳解…',
  ]

  const message = loadingSteps[currentStep % loadingSteps.length] || loadingSteps[0]

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg bg-card border border-border px-6 py-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <div className="text-lg font-medium text-foreground">
              {message}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/**
 * 移除 TypewriterMarkdown，改用 MarkdownExplain 以獲得一致的樣式
 */

/**
 * Main ExplainCardV2 component - Full Page Markdown Stream
 */
export default function ExplainCardV2({
  inputText,
  questionId,
  conservative = false,
  onLoadingChange,
  onExplainComplete,
}: ExplainCardV2Props) {
  const [loading, setLoading] = useState(true)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Refs for data persistence
  const viewModelRef = useRef<ExplainViewModel | null>(null)
  const questionBlocksRef = useRef<Array<{ stem: string; options: string[] }>>([])
  const passageRef = useRef<string>('')
  const loadingCbRef = useRef<typeof onLoadingChange>()
  const completeCbRef = useRef<typeof onExplainComplete>()

  useEffect(() => {
    loadingCbRef.current = onLoadingChange
  }, [onLoadingChange])

  useEffect(() => {
    completeCbRef.current = onExplainComplete
  }, [onExplainComplete])

  // Loading animation timer
  useEffect(() => {
    if (!loading) return
    const timer = setInterval(() => {
      setLoadingStep((prev) => prev + 1)
    }, 2000)
    return () => clearInterval(timer)
  }, [loading])

  // Fetch explanation
  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchExplanation() {
      try {
        setLoading(true)
        loadingCbRef.current?.(true)
        setError(null)
        questionBlocksRef.current = []
        passageRef.current = ''

        // 🎯 檢測是否為圖片輸入
        const isImageInput = inputText.startsWith('data:image/')

        // 1. Detect question set（前端兜底，支援多題拆解）
        // ⚠️ 圖片輸入直接跳過 question set 分析，讓後端處理
        if (!isImageInput && inputText.length >= 120) {
          try {
            const analysis = await analyseQuestionSet(inputText)
            if (analysis.questionCount > 1) {
              passageRef.current = analysis.passage || ''
              questionBlocksRef.current = analysis.questionBlocks.map((block) => ({
                stem: block.stem || inputText,
                options: block.options?.map((opt) => `(${opt.label}) ${opt.text}`) || [],
              }))
            }
          } catch (e) {
            console.warn('Question set detection failed:', e)
          }
        }

        // Helper to call explain API for a given text block
        const explainOnce = async (text: string) => {
          // 檢查是否要求不同解釋（從 backpack 提問）
          const isAlternativeMode = text.includes('[請用不同的角度重新解釋這題，並指出學生可能誤解的點]')
          let processedText = text

          if (isAlternativeMode) {
            // 移除特殊標記，並在 prompt 中添加要求
            processedText = text.replace(/\[請用不同的角度重新解釋這題，並指出學生可能誤解的點\]/g, '').trim()
            // 在文本末尾添加特殊指令
            processedText = `${processedText}\n\n[教學提示：請用不同的角度重新解釋這題，特別指出學生可能誤解的點，並提供更清晰的說明方式]`
          }

          const response = await fetch('/api/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: processedText },
              mode: 'deep',
              conservative,
              ...(questionId ? { questionId } : {}), // ✅ 傳遞 questionId 用於緩存 key 生成
            }),
            signal: abortController.signal,
          })

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}))
            throw new Error(errJson?.message || 'Failed to fetch explanation')
          }
          const res = await response.json()
          return res.data || res // Support both new (data wrapper) and old formats
        }

        // 2. Fetch explanation(s) (supports multi-question by splitting blocks)
        const blocks = questionBlocksRef.current
        const isMulti = blocks.length > 1
        const targets = isMulti
          ? blocks
          : [{ stem: inputText, options: [] }]

        const renderPassage = passageRef.current
          ? `## 原文\n\n${passageRef.current}`
          : ''

        // Helper to process a single explanation result
        const processResult = (data: any, target: { stem: string; options: string[] }, index: number) => {
          let md = ''
          let answer = ''
          let briefReason = ''

          const parseInlineOptions = (text: string) => {
            const opts: string[] = []
            const regex = /\(([A-D])\)\s*([^()]+)/g
            let match
            while ((match = regex.exec(text)) !== null) {
              const label = match[1]
              const optText = match[2].trim()
              if (optText) opts.push(`(${label}) ${optText}`)
            }
            return opts
          }

          const stemText = target.stem || inputText
          const baseOptions = target.options.length ? target.options : parseInlineOptions(stemText)
          const optionsInline = baseOptions.length
            ? baseOptions.map((opt) => opt.replace(/^\((.)\)\s*/, '($1) ')).join(' ｜ ')
            : ''

          if (data.viewModel) {
            if (index === 0) viewModelRef.current = data.viewModel
            const vm = data.viewModel
            md += `# 題目 ${index + 1}\n\n`
            if (stemText) {
              const isImage = stemText.trim().startsWith('data:image/')
              if (isImage) {
                md += `## 題幹\n\n![題目](${stemText})\n\n`
              } else {
                md += `## 題幹\n\n${stemText}\n\n`
              }
            }
            if (optionsInline) md += `## 選項\n\n${optionsInline}\n\n`
            const correctOption = vm.options?.find((opt: any) => opt.correct)
            const correctText = correctOption
              ? `(${correctOption.label}) ${correctOption.text}`
              : vm.answer
            if (vm.fullExplanation || vm.briefReason) {
              md += `## 題意說明\n\n${vm.fullExplanation || vm.briefReason}\n\n`
            }
            if (correctText) md += `## ✅ 正確答案\n\n- **${correctText}**\n\n`

            const wrongOptions = Array.isArray(vm.options)
              ? vm.options.filter((opt: any) => opt.reason && opt.correct !== true)
              : []
            if (wrongOptions.length > 0) {
              md += `## 錯誤選項解析\n\n`
              wrongOptions.forEach((opt: any) => {
                md += `- (${opt.label}) ${opt.text}：${opt.reason}\n`
              })
              md += '\n'
            }

            if (vm.cnTranslation) md += `## 翻譯\n\n${vm.cnTranslation}\n\n`
            if (vm.grammarHighlights && vm.grammarHighlights.length > 0) {
              md += `## 小結與記憶\n\n`
              vm.grammarHighlights.forEach((h: string) => {
                md += `- ${h}\n`
              })
              md += '\n'
            }
            answer = correctText || vm.answer || ''
            briefReason = vm.briefReason || vm.fullExplanation || ''
          } else {
            const rawOptions = Array.isArray(data.options) ? data.options : Array.isArray(data.choices) ? data.choices : []
            const inlineOptions =
              rawOptions.length > 0
                ? rawOptions.map((opt: any, i: number) => `(${String.fromCharCode(65 + i)}) ${String(opt)}`).join(' ｜ ')
                : optionsInline
            const answerLabel = data.answer_label || data.answerLabel
            const answerIndex = typeof data.answerIndex === 'number' ? data.answerIndex : undefined
            const inferredAnswer = answerLabel || (answerIndex != null ? String.fromCharCode(65 + answerIndex) : data.answer)

            md += `# 題目 ${index + 1}\n\n`
            if (stemText) {
              const isImage = stemText.trim().startsWith('data:image/')
              if (isImage) {
                md += `## 題幹\n\n![題目](${stemText})\n\n`
              } else {
                md += `## 題幹\n\n${stemText}\n\n`
              }
            }
            if (inlineOptions) md += `## 選項\n\n${inlineOptions}\n\n`
            if (inferredAnswer) md += `## ✅ 正確答案\n\n- **${inferredAnswer}**\n\n`
            const detail =
              data.fullExplanation ||
              data.markdown ||
              data.briefReason ||
              data.reason ||
              '解析已生成，但沒有提供 markdown 內容。'

            // Check if detail already has headers (is full markdown)
            const hasHeaders = /##\s+(題意說明|正確答案|錯誤選項解析|Reminder|小結與記憶)/.test(detail)

            if (hasHeaders) {
              md += `${detail}`
            } else {
              md += `## 詳解\n\n${detail}`
            }

            const optionReasons = Array.isArray(data.optionReasons) ? data.optionReasons : []
            if (optionReasons.length && rawOptions.length && !hasHeaders) {
              md += `\n## 錯誤選項解析\n\n`
              optionReasons.forEach((r: any, i: number) => {
                const label = String.fromCharCode(65 + i)
                const optText = rawOptions[i] ? `(${label}) ${rawOptions[i]}` : `(${label})`
                if (r) md += `- ${optText}：${r}\n`
              })
              md += '\n'
            }
            answer = inferredAnswer || ''
            briefReason = data.briefReason || data.reason || (hasHeaders ? '' : detail)
          }

          return { md, answer, briefReason }
        }

        // Parallel fetch for multiple questions (improves performance)
        const fetchPromises = targets.map((target, index) => {
          const combinedText = [target.stem, ...target.options].filter(Boolean).join('\n')
          return explainOnce(combinedText || inputText).then(data => ({
            data,
            target,
            index
          }))
        })

        const results = await Promise.all(fetchPromises)
        if (!mounted) return

        // Sort by index to maintain question order
        results.sort((a, b) => a.index - b.index)

        const markdownSections: string[] = []
        let firstAnswer = ''
        let firstReason = ''

        if (renderPassage) {
          markdownSections.push(renderPassage)
        }

        for (const { data, target, index } of results) {
          const { md, answer, briefReason } = processResult(data, target, index)
          markdownSections.push(md)
          if (index === 0) {
            firstAnswer = answer
            firstReason = briefReason
          }
        }

        const finalMarkdown = markdownSections.join('\n\n---\n\n')

        setMarkdownContent(finalMarkdown)
        setIsComplete(true)

        // Notify completion
        completeCbRef.current?.({
          questionText: inputText,
          answer: firstAnswer,
          reason: firstReason || undefined,
          markdown: finalMarkdown,
          summary: firstReason || undefined
        })

      } catch (err) {
        if (!mounted) return
        console.error('Explanation error:', err)
        setError(err instanceof Error ? err.message : '發生未知錯誤')
      } finally {
        if (mounted) {
          setLoading(false)
          loadingCbRef.current?.(false)
        }
      }
    }

    fetchExplanation()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [inputText, conservative])

  // Save to backpack
  const handleSave = async () => {
    if (!markdownContent || isSaving) return

    setIsSaving(true)

    try {
      // Detect subject from question text
      const { detectSubject } = await import('@/lib/utils/detect-subject')
      const subjectTag = detectSubject(inputText)

      const stemPrefix = questionBlocksRef.current.length
        ? questionBlocksRef.current
          .map((block, idx) => `### 題目 ${idx + 1}\n題幹：${block.stem || inputText}\n${block.options.join('\n')}`)
          .join('\n\n')
        : ''
      const passageSection = passageRef.current ? `## 原文\n\n${passageRef.current}` : ''
      const contentForSave = [passageSection, stemPrefix, markdownContent].filter(Boolean).join('\n\n')

      // 🎯 處理圖片上傳的情況：如果 inputText 是 base64 圖片，使用更友善的標題
      const isBase64Image = inputText.startsWith('data:image/')
      const title = isBase64Image
        ? `圖片題目解析 - ${new Date().toLocaleDateString('zh-TW')}`
        : inputText.slice(0, 50) + (inputText.length > 50 ? '...' : '')

      // 🔍 Debug: 檢查儲存的內容
      console.log('[ExplainCardV2] Saving to notebook:', {
        title,
        isBase64Image,
        contentLength: contentForSave.length,
        tags: [subjectTag, 'AI解析'],
        source_type: 'qa'
      })

      const response = await fetch('/api/notebook/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_md: contentForSave,
          tags: [subjectTag, 'AI解析'],
          source_type: 'qa'
        }),
      })

      // 🔍 獲取詳細的錯誤訊息
      const responseData = await response.json()
      console.log('[ExplainCardV2] Save response:', { status: response.status, data: responseData })

      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || '儲存失敗'
        throw new Error(errorMessage)
      }

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('[ExplainCardV2] Save failed:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <LoadingState currentStep={loadingStep} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">解析失敗</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>重試</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-6">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-6">
        {markdownContent && <MarkdownExplain markdown={markdownContent} />}
      </div>

      {/* Bottom CTA */}
      <div className="pt-4 border-t border-border/50">
        <Button
          variant={saveStatus === 'success' ? 'secondary' : 'default'} // Use secondary instead of outline to prevent "disappearing"
          size="lg"
          onClick={handleSave}
          disabled={isSaving || saveStatus === 'success'}
          className={`w-full rounded-xl ${saveStatus === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              儲存中
            </span>
          ) : saveStatus === 'success' ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              已存到筆記本
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              存到筆記本
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
