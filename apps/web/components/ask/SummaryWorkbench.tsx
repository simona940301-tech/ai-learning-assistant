'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, BarChart3, Loader2, RefreshCw, Check, Clipboard } from 'lucide-react'
import { FileUploader } from '@/components/ask/file-uploader'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/solve/MarkdownRenderer'
import { useAsk } from '@/lib/ask-context'
import type { AskResult, Reference, AttachedFile, SourceMode } from '@/lib/types'
import { inlineAttachmentContent } from '@/lib/attachment-utils'
import { parseSummaryMarkdown, buildCoverage, type SummarySlices, type CoverageDatum } from '@/lib/summary-utils'
import { cn } from '@/lib/utils'

type FocusBlueprint = {
  id: 'exam' | 'project' | 'flash'
  label: string
  subtitle: string
  ctaLabel: string
  persona: string
  objective: string
  outputFormat: string
}

const FOCUS_BLUEPRINTS: FocusBlueprint[] = [
  {
    id: 'exam',
    label: '考點巡檢',
    subtitle: '從檔案中抓考點與命題線索',
    ctaLabel: '產生考點列表',
    persona: '你是總複習名師，會像總結檢討講義一樣盤點考點、命題趨勢與易錯概念。',
    objective: '逐份附件萃取 recurring concept，標記出命題面向、教材章節與常見失誤提醒。',
    outputFormat:
      '維持 WHY / WHAT / HOW / CHECK 四區塊，每一條都附上對應的 [A#] 來源。必要時新增表格列出「考點 / 章節 / 佐證」。',
  },
  {
    id: 'project',
    label: '專題統整',
    subtitle: '多文件整成專家級解說',
    ctaLabel: '輸出統整表格',
    persona: '你是世界上最權威的研究員，受託針對附件內容撰寫專家說明，語氣專業而堅定。',
    objective:
      '針對每份附件說明提出的論點、證據與差異，補充背景並分層解釋「為什麼重要」與「如何應用」。',
    outputFormat:
      '優先輸出 WHY / WHAT / HOW / CHECK 表格，並在 WHY、WHAT 欄內提供小段專家評論；必要時追加比較表或層級式段落。',
  },
  {
    id: 'flash',
    label: '極速快閃卡',
    subtitle: 'NotebookLM 風格 Q/A',
    ctaLabel: '生成快閃卡',
    persona:
      '你是 NotebookLM 風格的學習教練，善於把原始資料壓縮成記憶卡片與對照表，語氣鼓勵且口語化。',
    objective: '選出最值得記憶的術語、公式、關鍵事件，並為每個概念設計前後相映的問題與答案。',
    outputFormat:
      '保留 WHY / WHAT / HOW / CHECK 以整理脈絡，但最後一定要有「## 快閃卡」區塊，列出至少 4 組 `Q:` / `A:`。如有比較/配對題，請用兩欄 Markdown 表格呈現。',
  },
]

const SOURCE_OPTIONS = [
  {
    id: 'backpack',
    label: 'Backpack',
    subtitle: '僅引用我上傳的內容',
  },
  {
    id: 'backpack_academic',
    label: '延伸',
    subtitle: '在白名單範圍內補充學術佐證',
  },
]

export function SummaryWorkbench() {
  const { attachedFiles, clearAll, sourceMode, setSourceMode } = useAsk()
  const [analysisText, setAnalysisText] = useState('')
  const [focusId, setFocusId] = useState<typeof FOCUS_BLUEPRINTS[number]['id']>('exam')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const focusPreset = useMemo(
    () => FOCUS_BLUEPRINTS.find((item) => item.id === focusId) ?? FOCUS_BLUEPRINTS[0],
    [focusId]
  )
  const primaryActionLabel = focusPreset?.ctaLabel ?? '輸出統整結果'

  const parsedSummary = useMemo(() => (result ? parseSummaryMarkdown(result.content) : null), [result])
  const coverage = useMemo(() => (parsedSummary ? buildCoverage(parsedSummary) : null), [parsedSummary])

  const attachmentStats = useMemo(() => {
    const totalBytes = attachedFiles.reduce((acc, file) => acc + (file.size ?? 0), 0)
    return {
      count: attachedFiles.length,
      sizeLabel: totalBytes ? `${(totalBytes / 1024 / 1024).toFixed(2)} MB` : '—',
    }
  }, [attachedFiles])

  const handleGenerate = async () => {
    if (!analysisText.trim() && attachedFiles.length === 0) {
      setError('請先上傳檔案或貼上重點，再開始統整。')
      return
    }

    setIsGenerating(true)
    setError(null)
    setCopied(false)

    try {
      const hydrated = await inlineAttachmentContent(attachedFiles)
      const prompt = buildModePrompt(focusPreset, analysisText)

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summary',
          prompt,
          attachments: hydrated,
          sourceMode,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || '統整失敗，請稍後再試。')
      }

      const data = (await response.json()) as AskResult
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : '統整失敗，請稍後再試。')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setAnalysisText('')
    setResult(null)
    setError(null)
    clearAll()
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16">
      <section className="rounded-[32px] border border-white/5 bg-[#06090D] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr,0.8fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/30">模式</p>
              <FocusChips focusId={focusId} onChange={setFocusId} />
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/30">想先說明什麼？</p>
              <textarea
                value={analysisText}
                onChange={(event) => setAnalysisText(event.target.value)}
                placeholder="貼上你的題目、段落或研究方向，保留空白行也沒關係。"
                className="min-h-[200px] w-full rounded-[28px] border border-white/10 bg-white/5/10 p-4 text-sm text-white shadow-inner outline-none transition focus:border-cyan-400/70"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 rounded-full px-6">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? '整理中…' : primaryActionLabel}
              </Button>
              <Button variant="ghost" onClick={handleReset} className="gap-2 text-white/70 hover:text-white">
                <RefreshCw className="h-4 w-4" />
                清空
              </Button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/30">來源</p>
              <SourceScopeSelector value={sourceMode} onChange={setSourceMode} />
              <dl className="mt-5 grid grid-cols-2 gap-4 text-xs text-white/60">
                <div>
                  <dt className="text-white/45">附件數量</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{attachmentStats.count}</dd>
                </div>
                <div>
                  <dt className="text-white/45">總量估計</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{attachmentStats.sizeLabel}</dd>
                </div>
              </dl>
            </div>
            <FileUploader />
          </div>
        </div>
      </section>

      <section>
        {result ? (
          <SummaryResultPanel
            result={result}
            parsed={parsedSummary}
            coverage={coverage}
            onCopy={handleCopy}
            copied={copied}
            isLoading={isGenerating}
            focusLabel={focusPreset?.label}
          />
        ) : (
          <EmptyState />
        )}
      </section>
    </div>
  )
}

function buildModePrompt(focus: FocusBlueprint, userText: string) {
  const blocks = [
    `# 模式：${focus.label}`,
    `## 角色\n${focus.persona}`,
    `## 目標\n${focus.objective}`,
    `## 輸出格式指引\n${focus.outputFormat}`,
  ]

  const trimmed = userText.trim()
  if (trimmed) {
    blocks.push(`## 使用者補充\n${trimmed}`)
  }

  blocks.push('## 規則\n- 不要捏造來源，僅引用附件或允許的延伸資料。\n- 每條 bullet 保持 60 字以內，使用 `•` 開頭。')
  return blocks.join('\n\n')
}

function FocusChips({
  focusId,
  onChange,
}: {
  focusId: FocusBlueprint['id']
  onChange: (id: FocusBlueprint['id']) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FOCUS_BLUEPRINTS.map((item) => {
        const active = item.id === focusId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'group flex min-w-[140px] flex-col rounded-full border px-4 py-3 text-left transition',
              active
                ? 'border-white text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]'
                : 'border-white/10 text-white/70 hover:border-white/30'
            )}
          >
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="text-[11px] text-white/60 opacity-0 transition group-hover:opacity-100">{item.subtitle}</span>
          </button>
        )
      })}
    </div>
  )
}

function SourceScopeSelector({ value, onChange }: { value: SourceMode; onChange: (mode: SourceMode) => void }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {SOURCE_OPTIONS.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id as SourceMode)}
            className={cn(
              'group flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition',
              active
                ? 'border-white text-white'
                : 'border-white/10 text-white/70 hover:border-white/30'
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-[11px] text-white/60 opacity-0 transition group-hover:opacity-100">{option.subtitle}</span>
          </button>
        )
      })}
    </div>
  )
}

interface SummaryResultPanelProps {
  result: AskResult
  parsed: SummarySlices | null
  coverage: CoverageDatum[] | null
  onCopy: () => void
  copied: boolean
  isLoading: boolean
  focusLabel?: string
}

function SummaryResultPanel({ result, parsed, coverage, onCopy, copied, isLoading, focusLabel }: SummaryResultPanelProps) {
  const generatedAt = new Date(result.created_at).toLocaleString()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 rounded-[28px] border border-white/5 bg-[#05080C] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-8"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/40">最新統整</p>
          <p className="text-lg font-semibold text-white">重點矩陣 · {generatedAt}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCopy} className="gap-2 rounded-full bg-white/10 text-white">
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? '已複製 Markdown' : '複製 Markdown'}
          </Button>
        </div>
      </header>

      {coverage && parsed ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr,0.6fr]">
          <SummaryMatrix slices={parsed} focus={focusLabel} />
          <CoverageChart coverage={coverage} selfCheck={parsed.selfCheck} flashcards={parsed.flashcards.length} />
        </div>
      ) : null}

      {parsed?.flashcards?.length ? <FlashcardBoard flashcards={parsed.flashcards} /> : null}

      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-white/10" />
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/10" />
          </div>
        ) : (
          <MarkdownRenderer content={result.content} />
        )}
      </div>

      <EvidenceList references={result.references} attachments={result.attachments} />
    </motion.div>
  )
}

function SummaryMatrix({ slices, focus }: { slices: SummarySlices; focus?: string }) {
  const rows = [
    { label: 'WHY · 考點', items: slices.why },
    { label: 'WHAT · 核心要素', items: slices.what },
    { label: 'HOW · 應用步驟', items: slices.how },
    { label: 'CHECK · 易混淆', items: slices.pitfalls },
  ]
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <BarChart3 className="h-4 w-4 text-cyan-300" />
        {focus ? `${focus} · ` : ''}WHY/WHAT/HOW/CHECK
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">{row.label}</p>
            <ul className="mt-2 space-y-1 text-sm text-white/80">
              {row.items.length ? (
                row.items.map((item, index) => (
                  <li key={`${row.label}-${index}`}>• {item}</li>
                ))
              ) : (
                <li className="text-white/40">待補</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoverageChart({
  coverage,
  selfCheck,
  flashcards,
}: {
  coverage: CoverageDatum[]
  selfCheck?: string
  flashcards: number
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
      <p className="text-sm font-semibold text-white">覆蓋率儀表</p>
      <div className="mt-4 space-y-3">
        {coverage.map((datum) => (
          <div key={datum.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>{datum.label}</span>
              <span>{datum.count} 筆</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <span
                className="block h-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                style={{ width: `${Math.max(datum.percent, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 p-3 text-xs text-white/70">
        <p className="font-semibold text-white">自檢提示</p>
        <p className="mt-1">{selfCheck || '尚未提供自我檢查句，建議補充。'}</p>
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 p-3 text-xs text-white/70">
        <p className="font-semibold text-white">快閃卡</p>
        <p className="mt-1">{flashcards} 組問答</p>
      </div>
    </div>
  )
}

function FlashcardBoard({ flashcards }: { flashcards: { question: string; answer: string }[] }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
      <p className="text-sm font-semibold text-white">快閃卡組</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {flashcards.map((card, index) => (
          <div key={`${card.question}-${index}`} className="rounded-2xl border border-white/5 p-4 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Q{index + 1}</p>
            <p className="mt-1 font-semibold text-white">{card.question || '待補'}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">A</p>
            <p className="mt-1">{card.answer || '待補'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EvidenceList({ references, attachments }: { references: Reference[]; attachments: AttachedFile[] }) {
  const hasReferences = references.length > 0
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-5">
      <p className="text-sm font-semibold text-white">資料來源</p>
      {hasReferences ? (
        <div className="mt-4 space-y-3">
          {references.map((ref, index) => (
            <div key={`${ref.id}-${index}`} className="rounded-2xl border border-white/5 bg-white/[0.01] p-3 text-sm text-white/80">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">來源 #{index + 1}</p>
              <p className="mt-1 font-semibold text-white">{ref.filename || ref.title || ref.id}</p>
              {ref.page || ref.paragraph ? (
                <p className="text-xs text-white/60">p.{ref.page} {ref.paragraph ? `· ${ref.paragraph}` : ''}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-white/60">尚未偵測到引用，建議補強。</p>
      )}

      {attachments.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {attachments.map((file) => (
            <span
              key={file.id}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
            >
              {file.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-white/60">
      <p className="text-lg font-semibold text-white/80">尚未生成統整</p>
      <p className="mt-2 text-sm">選好模式、上傳檔案或貼上段落，按下對應按鈕即可取得新的 Markdown 摘要或快閃卡。</p>
    </div>
  )
}
