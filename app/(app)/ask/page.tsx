'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Send, Plus, AlertTriangle, BookOpen, Calculator, Save, Square, Sparkles, X, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAsk } from '@/lib/ask-context'
import { useAnalytics } from '@/lib/analytics'
import { useMotivation } from '@/lib/motivation-system'
import { useExperiments } from '@/lib/experiment-framework'
import { useEthicalGuardian } from '@/lib/ethical-guardian'
import { SaveDialog, SaveData } from '@/components/ask/save-dialog'
import { AskResult, AttachedFile, TaskType } from '@/lib/types'
import { useTheme } from 'next-themes'
import { analytics } from '@/lib/analytics'

export default function AskPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const { attachedFiles, addFiles, removeFile, taskType, setTaskType } = useAsk()
  const analytics = useAnalytics()
  const motivation = useMotivation()
  const experiments = useExperiments()
  const ethicalGuardian = useEthicalGuardian()

  const [input, setInput] = useState('')
  const [result, setResult] = useState<AskResult | null>(null)
  const [lastUserInput, setLastUserInput] = useState('')
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [editCardContent, setEditCardContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveMode, setSaveMode] = useState<'save' | 'overwrite'>('save')
  const [scholarMode, setScholarMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [pendingTaskType, setPendingTaskType] = useState<TaskType | null>(null)
  const [evidenceOpen, setEvidenceOpen] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // English Tutor states (Module 1 + Module 2)
  const [simplifyData, setSimplifyData] = useState<{
    oneLine: string
    visualization: string
    contextBridge: string
    difficulty: string
  } | null>(null)
  const [options, setOptions] = useState<string[] | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [explainData, setExplainData] = useState<{
    correct: boolean
    feedback: string
    block: {
      title: string
      patternFormula: string
      keyPoint: string
      examples: string[]
      commonMistakes: string[]
      relatedPastExams: string[]
    }
  } | null>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      const newHeight = Math.min(inputRef.current.scrollHeight, 120) // max 5 lines ~24px each
      inputRef.current.style.height = `${newHeight}px`
    }
  }, [input])

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2000)
  }

  const handleTaskTypeSwitch = (newType: TaskType) => {
    if (hasUnsavedChanges) {
      setPendingTaskType(newType)
      setShowUnsavedWarning(true)
    } else {
      setTaskType(newType)
    }
  }

  // Remember last segmented selection
  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('ask_last_task_type')) as TaskType | null
    if (stored) setTaskType(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ask_last_task_type', taskType)
    }
  }, [taskType])

  const handleSaveAll = () => {
    setShowSaveDialog(true)
    setSaveMode('save')
    setShowUnsavedWarning(false)
    if (pendingTaskType) {
      setTaskType(pendingTaskType)
      setPendingTaskType(null)
    }
  }

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false)
    setShowUnsavedWarning(false)
    if (pendingTaskType) {
      setTaskType(pendingTaskType)
      setPendingTaskType(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const converted: AttachedFile[] = files.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: file.name,
      type: file.name.endsWith('.pdf') ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'text',
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    addFiles(converted)
    showToast('info', '已載入附件')
  }

  const handleGenerate = async () => {
    if (!input.trim() && attachedFiles.length === 0 && !scholarMode) {
      showToast('info', '請加入附件或貼上文字，或開啟「學霸補充」')
      analytics.trackError(new Error('Empty input validation failed'), 'ask_generate')
      return
    }

    setIsLoading(true)
    setLastUserInput(input)

    // 追蹤 AI 互動開始
    analytics.trackAIInteraction(taskType, undefined, false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (taskType === 'solve') {
        // Tutor flow: Module 1 + Module 2 in parallel
        setSimplifyData(null)
        setOptions(null)
        setExplainData(null)
        setSelectedOption(null)

        const [sRes, oRes] = await Promise.all([
          fetch('/api/tutor/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: input,
              attachments: attachedFiles,
              sourceMode: scholarMode ? 'backpack_academic' : 'backpack',
              moreBasic: false,
            }),
            signal: controller.signal,
          }),
          fetch('/api/tutor/options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: input, attachments: attachedFiles }),
            signal: controller.signal,
          }),
        ])

        const sData = await sRes.json()
        const oData = await oRes.json()
        if (!sRes.ok) throw new Error(sData.error || '簡化失敗')
        if (!oRes.ok) throw new Error(oData.error || '選項生成失敗')
        setSimplifyData(sData)
        setOptions(oData.options)
        setHasUnsavedChanges(false)
        showToast('success', '✓ 已產生')

        analytics.trackAIInteraction(taskType, 'english_grammar', true)
      } else {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: taskType,
            prompt: input,
            attachments: attachedFiles,
            sourceMode: scholarMode ? 'backpack_academic' : 'backpack',
            scholarMode,
          }),
          signal: controller.signal,
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '處理失敗')
        setResult(data)
        setHasUnsavedChanges(false)
        showToast('success', '✓ 已產生')

        // 倫理監控 - 檢查 AI 回應是否有偏見
        const biasCheck = ethicalGuardian.monitorAIInteraction(input, data.content, 'demo_user')
        if (biasCheck.biasDetected) {
          console.warn('AI Bias detected:', biasCheck.biasType, biasCheck.recommendations)
          // 在實際應用中，這裡會顯示偏見警告或採取修正措施
        }
        analytics.trackAIInteraction(taskType, data.solveType, true)
        
        // 觸發動機獎勵
        motivation.rewardAIInteraction(taskType, true)
        
        // 檢查里程碑
        const newMilestones = motivation.checkMilestones()
        if (newMilestones.length > 0) {
          showToast('success', `🏆 達成新成就: ${newMilestones[0].title}`)
        }

        // 追蹤實驗結果
        const userId = 'demo_user' // 在實際應用中從認證系統獲取
        experiments.trackResult(userId, 'ai_response_format', {
          user_satisfaction: 4.5, // 模擬滿意度評分
          completion_rate: 1.0, // 100% 完成率
          time_to_read: 30000, // 模擬閱讀時間 (30秒)
        })

        setTimeout(() => {
          if (resultRef.current) {
            const firstSection = resultRef.current.querySelector('[data-section-id="section-0"]')
            firstSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 150)
      }
    } catch (err: any) {
      // 追蹤錯誤
      analytics.trackError(err, 'ai_generation')
      
      // 觸發動機系統的情緒安全檢查
      const safetyCheck = motivation.performEmotionalSafetyCheck()
      if (!safetyCheck.safe) {
        console.warn('Emotional safety concerns:', safetyCheck.concerns)
      }
      
      if (err?.name === 'AbortError') {
        showToast('info', '已取消')
      } else {
        showToast('error', err.message || '發生錯誤')
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  const handleCardEditToggle = () => {
    if (!result) return
    if (!isEditingCard) {
      setEditCardContent(result.content)
      setIsEditingCard(true)
    } else {
      setIsEditingCard(false)
      setEditCardContent('')
    }
  }

  const handleConfirmEditCard = () => {
    if (!result) return
    setResult({ ...result, content: editCardContent, isEditing: false })
    setIsEditingCard(false)
    setHasUnsavedChanges(true)
    showToast('success', '✓ 已保存到暫存')
  }

  const handleSave = async (saveData: SaveData) => {
    try {
      // Prefer structured explanation content if available
      let contentToSave = result?.content || ''
      if (explainData) {
        const b = explainData.block
        const lines = [
          `## 考點`,
          `• ${b.title}`,
          `\n## 核心要素`,
          `• Formula: ${b.patternFormula}`,
          `• Key: ${b.keyPoint}`,
          `\n## 應用步驟`,
          ...b.examples.slice(0, 3).map(e => `• ${e}`),
          `\n## 混淆與自檢`,
          ...b.commonMistakes.slice(0, 2).map(m => `• ${m}`),
          `• 自我檢查：可否前置介系詞？` ,
          `\n## 快閃卡`,
          `Q: What is the pattern?`,
          `A: ${b.patternFormula}`,
          `Q: When to use whom?`,
          `A: When a preposition precedes.`,
          `Q: One example`,
          `A: ${b.examples[0] || ''}`,
        ]
        contentToSave = lines.join('\n')
      }
      const response = await fetch('/api/backpack/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saveData,
          content: contentToSave,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '儲存失敗')
      }

      setHasUnsavedChanges(false)
      showToast('success', saveData.mode === 'overwrite' ? '✓ 編輯完成' : '✓ 已存至書包')

      // Visible save: update local list and navigate with highlight
      const saved = data.data || data.file || data
      if (saved?.id) {
        try {
          const raw = localStorage.getItem('backpack_items')
          const list = raw ? JSON.parse(raw) : []
          const newItem = {
            id: saved.id,
            user_id: 'local-user',
            subject: saveData.subject,
            type: 'text',
            title: saveData.title,
            content: result?.content || '',
            file_url: null,
            derived_from: result?.attachments?.map(a => a.name) || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const updated = [newItem, ...list]
          localStorage.setItem('backpack_items', JSON.stringify(updated))
        } catch {}
        router.push(`/backpack?highlight=${saved.id}`)
      }
    } catch (error: any) {
      showToast('error', '保存失敗，已保留草稿')
      throw error
    }
  }

  const toggleScholarMode = () => {
    const newMode = !scholarMode
    setScholarMode(newMode)
    if (newMode) {
      showToast('info', '已補充學霸筆記')
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Segment Switcher (Centered Pills) */}
      <header className="border-b" style={{ borderColor: '#C8C8C8' }}>
        <div className="flex h-14 items-center justify-center">
          <div className="inline-flex rounded-full bg-muted p-1">
            <button
              onClick={() => handleTaskTypeSwitch('summary')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[16px] transition-all duration-150 ${
                taskType === 'summary'
                  ? 'bg-background shadow-sm'
                  : 'text-[#8A8A8A]'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              整理
            </button>
            <button
              onClick={() => handleTaskTypeSwitch('solve')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[16px] transition-all duration-150 ${
                taskType === 'solve'
                  ? 'bg-background shadow-sm'
                  : 'text-[#8A8A8A]'
              }`}
            >
              <Calculator className="h-4 w-4" />
              解題
            </button>
          </div>
        </div>

        {/* Unsaved Warning Bar */}
        <AnimatePresence>
          {showUnsavedWarning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden bg-yellow-500/10"
            >
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 text-[13px] text-yellow-600 dark:text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  有未保存的更動
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveAll}
                    className="h-7 text-[13px]"
                  >
                    保存全部
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDiscardChanges}
                    className="h-7 text-[13px] text-[#8A8A8A]"
                  >
                    放棄
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Thread (Scrollable) */}
      <div className="flex-1 overflow-y-auto pb-4" ref={resultRef}>
        <div className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
          {!result && !isLoading && (
            <div className="flex h-[40vh] items-center justify-center text-center">
              <div className="max-w-sm space-y-2">
                <p className="text-[16px] text-muted-foreground" style={{ lineHeight: 1.75 }}>
                  開始提問，或加入附件
                </p>
                <p className="text-[13px] text-[#8A8A8A]">底部輸入框支援最多 5 行</p>
              </div>
            </div>
          )}

          {(lastUserInput || attachedFiles.length > 0) && (isLoading || result || simplifyData || options) && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="max-w-[85%] rounded-2xl border p-3" style={{ borderColor: '#C8C8C8' }}>
                  {lastUserInput && (
                    <p className="text-[16px]" style={{ lineHeight: 1.75 }}>{lastUserInput}</p>
                  )}
                  {attachedFiles.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {attachedFiles.map((file) => (
                        <div key={file.id} className="h-8 w-8 overflow-hidden rounded bg-muted">
                          {file.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={file.preview} alt={file.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#8A8A8A]">
                              <span className="text-[10px] font-medium">
                                {file.name.split('.').pop()?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="pl-11 text-[13px]">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8A8A8A] to-foreground">
                {taskType === 'summary' ? '整理中' : '解題中'}
              </span>
              <span className="inline-flex w-5 justify-between pl-1 align-baseline">
                <span className="animate-bounce [animation-delay:-0.2s]">·</span>
                <span className="animate-bounce [animation-delay:-0.1s]">·</span>
                <span className="animate-bounce">·</span>
              </span>
            </div>
          )}

          {(result || simplifyData || options) && !isLoading && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              <div className="relative rounded-2xl border p-4" style={{ borderColor: '#C8C8C8' }}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold">回答</h2>
                  <div className="flex items-center gap-2">
                    {!isEditingCard ? (
                      <>
                        <button
                          onClick={handleCardEditToggle}
                          className="text-[13px] text-[#8A8A8A] hover:text-foreground transition-colors"
                          aria-label="編輯"
                        >
                          ✏︎ 編輯
                        </button>
                        <button
                          onClick={() => setEvidenceOpen(!evidenceOpen)}
                          className="text-[13px] text-[#8A8A8A] hover:text-foreground transition-colors flex items-center"
                          aria-label="來源"
                        >
                          <Square className="mr-1 h-3 w-3" /> 來源
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleCardEditToggle}
                        className="text-[13px] text-[#8A8A8A] hover:text-foreground transition-colors flex items-center"
                        aria-label="取消編輯"
                      >
                        <X className="mr-1 h-3 w-3" /> 取消
                      </button>
                    )}
                  </div>
                </div>

                {result && result.unverified.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mb-2 rounded bg-yellow-500/10 px-3 py-1 text-[13px] text-yellow-600 dark:text-yellow-500"
                  >
                    偵測未標注來源的敘述
                  </motion.div>
                )}

                {!isEditingCard ? (
                  taskType === 'solve' && (simplifyData || options) ? (
                    <TutorModules
                      simplify={simplifyData}
                      options={options}
                      selected={selectedOption}
                      explain={explainData}
                      onSimplifyFurther={handleSimplifyFurther}
                      onSelectOption={handleSelectOption}
                      onAddToBackpack={() => {
                        setSaveMode('save')
                        setShowSaveDialog(true)
                      }}
                    />
                  ) : (
                    <AssistantSections content={result.content} />
                  )
                ) : (
                  <div>
                    <textarea
                      value={editCardContent}
                      onChange={(e) => setEditCardContent(e.target.value)}
                      className="w-full min-h-[200px] resize-y rounded border bg-background px-3 py-2 text-[16px] focus:ring-1 focus:ring-ring"
                      style={{ lineHeight: 1.75 }}
                    />
                    <div className="mt-3 flex justify-center">
                      <Button onClick={handleConfirmEditCard} className="px-6">確認</Button>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {evidenceOpen && result && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mt-3 overflow-hidden rounded-lg border bg-muted/30 p-4"
                    >
                      <EvidenceDrawer result={result} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2" style={{ borderColor: '#C8C8C8' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerate()}
                    className="h-7 text-[13px]"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> 重新產生
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSaveMode('save')
                      setShowSaveDialog(true)
                    }}
                    className="h-7 text-[13px]"
                  >
                    <Save className="mr-1 h-3 w-3" /> 另存
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSaveMode('overwrite')
                      setShowSaveDialog(true)
                    }}
                    className="h-7 text-[13px]"
                  >
                    編輯完成
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Composer */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="border-t bg-background"
        style={{ borderColor: '#C8C8C8' }}
      >
        {/* Attachments Bar (40×40 thumbnails) */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="overflow-x-auto border-b px-4 py-2"
              style={{ borderColor: '#C8C8C8' }}
            >
              <div className="flex gap-2">
                {attachedFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="relative shrink-0"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded bg-muted">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#8A8A8A]">
                          <span className="text-[10px] font-medium">
                            {file.name.split('.').pop()?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-transform hover:scale-110"
                    >
                      <Plus className="h-3 w-3 rotate-45" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Row with Paper Plane */}
        <div className="flex items-end gap-2 p-3">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </motion.div>
          </label>

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="貼上文字或描述..."
              className="w-full min-h-[36px] resize-none rounded-lg border bg-background px-3 py-2 pr-24 text-[16px] outline-none focus:ring-1 focus:ring-ring transition-all"
              style={{ lineHeight: 1.5, maxHeight: '120px' }}
              rows={1}
            />

            {/* Scholar toggle + Cancel */}
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              {isLoading && (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="text-[13px] text-[#8A8A8A] hover:text-foreground"
                >
                  取消
                </button>
              )}
              <button
                onClick={toggleScholarMode}
                title={`學霸補充：${scholarMode ? '開' : '關'}`}
                aria-label="學霸補充切換"
                className={`flex h-7 w-7 items-center justify-center rounded ${
                  scholarMode ? 'bg-primary text-primary-foreground' : 'border text-[#8A8A8A]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="h-9 w-9 p-0 transition-all duration-150"
            style={{
              opacity: isLoading || (!input.trim() && attachedFiles.length === 0 && !scholarMode) ? 0.4 : 1,
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.12 }}
            className="fixed bottom-32 left-1/2 z-50 -translate-x-1/2"
          >
            <div
              className={`rounded-full px-4 py-2 text-[13px] font-medium shadow-lg ${
                toast.type === 'success'
                  ? 'bg-[#28C281] text-white'
                  : toast.type === 'error'
                  ? 'bg-[#FF4D4F] text-white'
                  : 'bg-[#3A8DFF] text-white'
              }`}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Dialog */}
      {result && (
        <SaveDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          result={result}
          mode={saveMode}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// Section Cards Component
function AssistantSections({ content }: { content: string }) {
  const sections = parseSections(content)
  return (
    <div className="space-y-3">
      {sections.map((section, idx) => (
        <div key={idx} data-section-id={`section-${idx}`} className="rounded-xl">
          <h2 className="mb-1 text-[18px] font-semibold">{section.title}</h2>
          <div className="space-y-2">
            {section.body.map((line, i) => (
              <div key={i} className="text-[16px]" style={{ lineHeight: 1.75 }}>
                {formatLine(line)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Tutor modules renderer
function TutorModules({
  simplify,
  options,
  selected,
  explain,
  onSimplifyFurther,
  onSelectOption,
  onAddToBackpack,
}: {
  simplify: { oneLine: string; visualization: string; contextBridge: string; difficulty: string } | null
  options: string[] | null
  selected: string | null
  explain: { correct: boolean; feedback: string; block: { title: string; patternFormula: string; keyPoint: string; examples: string[]; commonMistakes: string[]; relatedPastExams: string[] } } | null
  onSimplifyFurther: () => void
  onSelectOption: (opt: string) => void
  onAddToBackpack: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Module 1 — Simplify & Visualize */}
      {simplify && (
        <div className="rounded-lg border p-3" style={{ borderColor: '#C8C8C8' }}>
          <h3 className="mb-2 text-[16px] font-semibold">簡化與視覺化</h3>
          <div className="space-y-2">
            <div className="text-[16px]" style={{ lineHeight: 1.75 }}>{simplify.oneLine}</div>
            <pre className="whitespace-pre-wrap rounded bg-muted/50 p-2 text-[13px]" style={{ lineHeight: 1.6 }}>{simplify.visualization}</pre>
            <div className="text-[13px] text-[#8A8A8A]" style={{ lineHeight: 1.75 }}>{simplify.contextBridge}</div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span className="text-[#8A8A8A]">難度：{simplify.difficulty}</span>
            <button onClick={onSimplifyFurther} className="text-[13px] text-blue-600 hover:underline">Simplify further 🔁</button>
          </div>
        </div>
      )}

      {/* Module 2 — Multi-Path Tutor */}
      {options && (
        <div className="rounded-lg border p-3" style={{ borderColor: '#C8C8C8' }}>
          <h3 className="mb-2 text-[16px] font-semibold">This question is most likely testing:</h3>
          <div className="space-y-1">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectOption(opt)}
                className={`w-full rounded px-3 py-2 text-left text-[16px] transition-colors ${selected === opt ? 'bg-accent' : 'hover:bg-muted'}`}
                style={{ lineHeight: 1.75 }}
              >
                ({idx + 1}) {opt}
              </button>
            ))}
          </div>

          {explain && (
            <div className="mt-3 rounded border p-3" style={{ borderColor: '#C8C8C8' }}>
              <div className={`mb-2 text-[13px] ${explain.correct ? 'text-green-600' : 'text-[#8A8A8A]'}`}>{explain.feedback}</div>
              <div className="space-y-2">
                <div className="text-[16px] font-semibold">{explain.block.title}</div>
                <div className="text-[16px]" style={{ lineHeight: 1.75 }}>Formula: {explain.block.patternFormula}</div>
                <div className="text-[16px]" style={{ lineHeight: 1.75 }}>Key: {explain.block.keyPoint}</div>
                {explain.block.examples.length > 0 && (
                  <div>
                    <div className="text-[13px] font-medium text-[#8A8A8A]">Examples</div>
                    <div className="mt-1 space-y-1">
                      {explain.block.examples.slice(0, 3).map((e, i) => (
                        <div key={i} className="text-[16px]" style={{ lineHeight: 1.75 }}>• {e}</div>
                      ))}
                    </div>
                  </div>
                )}
                {explain.block.commonMistakes.length > 0 && (
                  <div>
                    <div className="text-[13px] font-medium text-[#8A8A8A]">Common Mistakes</div>
                    <div className="mt-1 space-y-1">
                      {explain.block.commonMistakes.slice(0, 2).map((m, i) => (
                        <div key={i} className="text-[16px]" style={{ lineHeight: 1.75 }}>• {m}</div>
                      ))}
                    </div>
                  </div>
                )}
                {explain.block.relatedPastExams.length > 0 && (
                  <div>
                    <div className="text-[13px] font-medium text-[#8A8A8A]">Related Past Exams</div>
                    <div className="mt-1 space-y-1">
                      {explain.block.relatedPastExams.slice(0, 3).map((r, i) => (
                        <div key={i} className="text-[16px]" style={{ lineHeight: 1.75 }}>• {r}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 text-right">
                <button onClick={onAddToBackpack} className="text-[13px] text-blue-600 hover:underline">📎 Add to Backpack</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Evidence Drawer Component
function EvidenceDrawer({ result }: { result: AskResult }) {
  const backpackRefs = result.references.filter((r) => r.type === 'backpack')
  const scholarRefs = result.sourceMode === 'backpack_academic'
    ? result.references.filter((r) => r.type === 'academic')
    : []

  return (
    <div className="space-y-4">
      {/* Your Attachments */}
      {backpackRefs.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-[#8A8A8A]">你的附件</h3>
          <div className="space-y-1">
            {backpackRefs.map((ref) => (
              <div key={ref.id} className="text-[13px]" style={{ lineHeight: 1.6 }}>
                • {ref.filename} {ref.page && `— p.${ref.page}`}
                {ref.paragraph && ` ${ref.paragraph}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scholar Supplements */}
      {scholarRefs.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-[#8A8A8A]">學霸補充</h3>
          <div className="space-y-2">
            {scholarRefs.map((ref) => (
              <div key={ref.id} className="rounded bg-blue-500/10 p-2 text-[13px]" style={{ lineHeight: 1.6 }}>
                <div className="font-medium">{ref.title}</div>
                <div className="text-[#8A8A8A]">
                  {ref.authors} ({ref.year}) {ref.doi && `• DOI: ${ref.doi}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {backpackRefs.length === 0 && scholarRefs.length === 0 && (
        <div className="text-center text-[13px] text-[#8A8A8A]">待補</div>
      )}
    </div>
  )
}

// Helper Functions
function parseSections(content: string): { title: string; body: string[] }[] {
  const lines = content.split('\n').filter((l) => l.trim())
  const sections: { title: string; body: string[] }[] = []
  let currentSection: { title: string; body: string[] } | null = null

  lines.forEach((line) => {
    if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: line.replace('## ', ''), body: [] }
    } else if (currentSection && line.trim()) {
      currentSection.body.push(line)
    }
  })

  if (currentSection) sections.push(currentSection)
  return sections
}

function formatLine(text: string): React.ReactNode {
  // Remove citation codes - don't show them inline
  let formatted = text.replace(/\[([AB]\d+)\]/g, '')
  // Remove unverified markers
  formatted = formatted.replace(/（未證實）/g, '')
  // Clean up bullet points
  formatted = formatted.replace(/^[•\-\*]\s*/, '• ')
  return formatted
}
